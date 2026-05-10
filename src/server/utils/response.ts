import { Response } from 'express';

export const success = (res: Response, data: any, message = 'Success', status = 200) => {
  return res.status(status).json({
    success: true,
    data,
    message
  });
};

export const error = (res: Response, message = 'Error', code = 'INTERNAL_ERROR', status = 500) => {
  return res.status(status).json({
    success: false,
    error: {
      code,
      message
    }
  });
};
