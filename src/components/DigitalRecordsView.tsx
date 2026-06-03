import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  FileText,
  ClipboardList,
  Plus,
  ExternalLink,
  Loader2,
  CheckCircle2,
  HardDrive,
  FolderPlus,
} from "lucide-react";
import {
  docsService,
  formsService,
  driveService,
} from "../services/googleWorkspaceService";
import { toast } from "react-hot-toast";

const DigitalRecordsView: React.FC = () => {
  const [isCreatingDoc, setIsCreatingDoc] = useState(false);
  const [isCreatingForm, setIsCreatingForm] = useState(false);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [lastCreated, setLastCreated] = useState<{
    type: "doc" | "form" | "folder";
    url: string;
  } | null>(null);

  const handleCreateIncidentReport = async () => {
    setIsCreatingDoc(true);
    try {
      const title = `Brgy Incident Report - ${new Date().toLocaleDateString()}`;
      const result = await docsService.createDocument(title);
      if (result.documentId) {
        const url = `https://docs.google.com/document/d/${result.documentId}/edit`;
        setLastCreated({ type: "doc", url });
        toast.success("Incident Report Document Created!", { icon: "📄" });
      } else {
        throw new Error("Failed to retrieve Document ID");
      }
    } catch (error: any) {
      console.error("Error creating doc:", error);
      toast.error(`Verification Failed: ${error.message}`);
    } finally {
      setIsCreatingDoc(false);
    }
  };

  const handleCreateClearanceForm = async () => {
    setIsCreatingForm(true);
    try {
      const title = `Barangay Clearance Request Form - ${new Date().getFullYear()}`;
      const result = await formsService.createForm(title);
      if (result.formId) {
        const url = `https://docs.google.com/forms/d/${result.formId}/edit`;
        setLastCreated({ type: "form", url });
        toast.success("Clearance Request Form Created!", { icon: "📝" });
      } else {
        throw new Error("Failed to retrieve Form ID");
      }
    } catch (error: any) {
      console.error("Error creating form:", error);
      toast.error(`Auth Error: ${error.message}`);
    } finally {
      setIsCreatingForm(false);
    }
  };

  const handleCreateArchiveFolder = async () => {
    setIsCreatingFolder(true);
    try {
      const months = [
        "JAN",
        "FEB",
        "MAR",
        "APR",
        "MAY",
        "JUN",
        "JUL",
        "AUG",
        "SEP",
        "OCT",
        "NOV",
        "DEC",
      ];
      const folderName = `SOS_ARCHIVE_${
        months[new Date().getMonth()]
      }_${new Date().getFullYear()}`;
      const result = await driveService.createFolder(folderName);
      if (result.id) {
        const url = `https://drive.google.com/drive/folders/${result.id}`;
        setLastCreated({ type: "folder", url });
        toast.success("Evidence Archive Folder Created!", { icon: "📁" });
      } else {
        throw new Error("Failed to create Folder");
      }
    } catch (error: any) {
      console.error("Error creating folder:", error);
      toast.error(`Drive Error: ${error.message}`);
    } finally {
      setIsCreatingFolder(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto pb-20">
      <div className="mb-8">
        <h1 className="text-2xl font-black font-mono text-white flex items-center gap-3">
          <FileText className="text-info w-8 h-8" />
          DIGITAL COMMAND RECORDS
        </h1>
        <p className="text-white/50 font-mono text-xs mt-2 uppercase tracking-widest">
          Generate official Barangay documentation using Google Workspace
          integration.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Google Drive Card */}
        <motion.div
          whileHover={{ y: -5 }}
          className="bg-zinc-900/50 border border-white/10 rounded-2xl p-6 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <HardDrive size={80} />
          </div>
          <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
            <HardDrive className="text-emerald-400" />
            Evidence Archive
          </h2>
          <p className="text-white/40 text-sm mb-6 leading-relaxed">
            Provision a dedicated Google Drive folder for the current
            operational cycle. Use this to organize incident photos and video
            evidence.
          </p>
          <button
            onClick={handleCreateArchiveFolder}
            disabled={isCreatingFolder}
            className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-900/50 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-900/20"
          >
            {isCreatingFolder ? (
              <Loader2 className="animate-spin" />
            ) : (
              <FolderPlus size={20} />
            )}
            CREATE MONTHLY ARCHIVE
          </button>
        </motion.div>

        {/* Google Docs Card */}
        <motion.div
          whileHover={{ y: -5 }}
          className="bg-zinc-900/50 border border-white/10 rounded-2xl p-6 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <FileText size={80} />
          </div>
          <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
            <FileText className="text-blue-400" />
            Incident Reports
          </h2>
          <p className="text-white/40 text-sm mb-6 leading-relaxed">
            Generate a secure Google Doc for detailed incident logging, evidence
            compilation, and official archiving.
          </p>
          <button
            onClick={handleCreateIncidentReport}
            disabled={isCreatingDoc}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-900/50 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-900/20"
          >
            {isCreatingDoc ? (
              <Loader2 className="animate-spin" />
            ) : (
              <Plus size={20} />
            )}
            GENERATE DOC REPORT
          </button>
        </motion.div>

        {/* Google Forms Card */}
        <motion.div
          whileHover={{ y: -5 }}
          className="bg-zinc-900/50 border border-white/10 rounded-2xl p-6 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <ClipboardList size={80} />
          </div>
          <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
            <ClipboardList className="text-purple-400" />
            Resident Forms
          </h2>
          <p className="text-white/40 text-sm mb-6 leading-relaxed">
            Deploy Google Forms for Barangay Clearance requests, mapping
            surveys, or community feedback collection.
          </p>
          <button
            onClick={handleCreateClearanceForm}
            disabled={isCreatingForm}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-900/50 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-purple-900/20"
          >
            {isCreatingForm ? (
              <Loader2 className="animate-spin" />
            ) : (
              <Plus size={20} />
            )}
            DEPLOY GOOGLE FORM
          </button>
        </motion.div>
      </div>

      {lastCreated && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-8 bg-success/10 border border-success/20 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4"
        >
          <div className="flex items-center gap-4">
            <div className="bg-success/20 p-3 rounded-xl">
              <CheckCircle2 className="text-success" />
            </div>
            <div>
              <p className="text-white font-bold uppercase tracking-tight">
                Resource Created Successfully
              </p>
              <p className="text-white/50 text-xs font-mono">
                Your{" "}
                {lastCreated.type === "doc"
                  ? "Google Doc"
                  : lastCreated.type === "form"
                  ? "Google Form"
                  : "Drive Folder"}{" "}
                is ready.
              </p>
            </div>
          </div>
          <a
            href={lastCreated.url}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-success text-black font-black px-6 py-3 rounded-xl flex items-center gap-2 hover:scale-105 transition-transform"
          >
            OPEN IN WORKSPACE <ExternalLink size={18} />
          </a>
        </motion.div>
      )}

      <div className="mt-12 bg-info/5 border border-info/10 rounded-2xl p-6">
        <h3 className="text-info font-black font-mono text-sm mb-4 uppercase tracking-widest">
          Digital Archive Pipeline
        </h3>
        <ul className="space-y-4">
          <li className="flex items-start gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-info mt-1.5" />
            <p className="text-white/60 text-xs leading-relaxed">
              Documents are automatically created in the connected Google
              account's primary directory.
            </p>
          </li>
          <li className="flex items-start gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-info mt-1.5" />
            <p className="text-white/60 text-xs leading-relaxed">
              Incident reports include dynamic timestamps but require manual
              summary population from the AI Command console.
            </p>
          </li>
          <li className="flex items-start gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-info mt-1.5" />
            <p className="text-white/60 text-xs leading-relaxed">
              Google Forms can be linked to QR codes for physical deployment at
              Barangay checkpoints.
            </p>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default DigitalRecordsView;
