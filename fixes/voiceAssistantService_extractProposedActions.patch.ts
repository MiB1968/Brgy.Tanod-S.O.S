// PATCH: src/server/services/voiceAssistantService.ts
//
// HIGH-01 — extractProposedActions() was keyword-matching the plain-text reply.
// By the time that runs, Gemini has already executed tool calls via functionCalls[].
// The structured data was being discarded in favour of regex guessing.
//
// Changes:
//   1. extractProposedActions now accepts an optional functionCalls array.
//   2. When functionCalls are present, it maps each tool call to the correct
//      VoiceCommandType and preserves the call args as the action payload.
//   3. Text fallback is kept for cases where no tool calls were made (pure chat).
//   4. Call sites updated to pass result.functionCalls before the second Gemini call.
//
// ── Replace the private extractProposedActions method ───────────────────────

  // Tool-name → VoiceCommandType mapping
  private readonly TOOL_TO_COMMAND: Record<string, VoiceCommandType> = {
    find_nearest_tanod:    VoiceCommandType.EMERGENCY_DISPATCH,
    update_sos_status:     VoiceCommandType.INCIDENT_UPDATE,
    create_incident_report:VoiceCommandType.REPORT_GENERATION,
    generate_formal_report:VoiceCommandType.REPORT_GENERATION,
    get_active_sos:        VoiceCommandType.STATUS_INQUIRY,
    get_tanod_list:        VoiceCommandType.STATUS_INQUIRY,
    schedule_patrol:       VoiceCommandType.PATROL_ASSIGNMENT,
    send_push_notification:VoiceCommandType.EMERGENCY_DISPATCH,
    broadcast_to_responders:VoiceCommandType.BROADCAST_ALERT,
    system_check:          VoiceCommandType.SYSTEM_CHECK,
  };

  /**
   * Derives proposed actions from the model's response.
   *
   * Priority order:
   *   1. Structured tool/function calls (authoritative — Gemini decided to act)
   *   2. Text keyword fallback (used only when no tool calls were made)
   */
  private extractProposedActions(
    text: string,
    functionCalls?: Array<{ name: string; args?: Record<string, any> }>
  ): ProposedAction[] {
    // ── 1. Structured path ───────────────────────────────────────────────────
    if (functionCalls && functionCalls.length > 0) {
      return functionCalls.map((call): ProposedAction => {
        const commandType = this.TOOL_TO_COMMAND[call.name] ?? VoiceCommandType.UNKNOWN;

        // Actions that modify state require confirmation; read-only ones don't
        const readOnlyTools = new Set(['get_active_sos', 'get_tanod_list', 'find_nearest_tanod']);
        const requiresConfirmation = !readOnlyTools.has(call.name);

        return {
          type: commandType,
          description: this.describeToolCall(call.name, call.args),
          confidence: 0.95, // High confidence — model explicitly chose this tool
          requiresConfirmation,
          payload: call.args ?? {},
        };
      });
    }

    // ── 2. Text fallback (for conversational replies with no tool calls) ─────
    const actions: ProposedAction[] = [];
    const lower = text.toLowerCase();

    if (lower.includes('dispatch') || lower.includes('ipadala') || lower.includes('patrol')) {
      actions.push({
        type: VoiceCommandType.EMERGENCY_DISPATCH,
        description: 'Dispatch nearest Tanods to the reported location',
        confidence: 0.65, // Lower — inferred from text, not structured
        requiresConfirmation: true,
        payload: {},
      });
    }

    return actions;
  }

  /** Human-readable description for a tool call, used in the UI confirmation dialog */
  private describeToolCall(name: string, args?: Record<string, any>): string {
    switch (name) {
      case 'find_nearest_tanod':
        return `Find nearest Tanod at (${args?.lat?.toFixed(4)}, ${args?.lng?.toFixed(4)})`;
      case 'update_sos_status':
        return `Update SOS #${args?.sos_id} → ${args?.status}${args?.assigned_to ? ` (assign to ${args.assigned_to})` : ''}`;
      case 'schedule_patrol':
        return `Schedule patrol: ${args?.tanod_id} → ${args?.area} (${args?.duration_hours ?? 4}h)`;
      case 'broadcast_to_responders':
        return `Broadcast to all responders: "${args?.title}"`;
      case 'send_push_notification':
        return `Push notification → ${args?.title}`;
      case 'create_incident_report':
      case 'generate_formal_report':
        return `Generate incident report for SOS #${args?.sos_id}`;
      case 'get_active_sos':
        return 'Retrieve active SOS alerts';
      case 'get_tanod_list':
        return `List ${args?.only_available ? 'available' : 'all'} Tanod units`;
      default:
        return `Execute ${name}`;
    }
  }

// ── Call-site changes ────────────────────────────────────────────────────────
// In processVoiceInput (and processMultimodalInput), update the two places
// where extractProposedActions is called:
//
// BEFORE (line ~261):
//   const proposedActions = this.extractProposedActions(replyText);
//
// AFTER:
//   // Pass the *first-round* functionCalls (before tool execution loop runs)
//   // so confirmed tool use is captured even if the second Gemini call
//   // returns a plain-text summary.
//   const proposedActions = this.extractProposedActions(replyText, firstRoundFunctionCalls);
//
// Add before the tool-execution block:
//   const firstRoundFunctionCalls = result.functionCalls ?? [];
//
// Then pass firstRoundFunctionCalls to extractProposedActions at both call sites.
