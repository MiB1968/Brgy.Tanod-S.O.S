export class ApiResponse {
  static success(data: any, message = 'Success') {
    return {
      success: true,
      data,
      message,
    };
  }

  static error(message = 'Error', code = 'INTERNAL_ERROR') {
    return {
      success: false,
      error: {
        code,
        message,
      },
    };
  }
}
