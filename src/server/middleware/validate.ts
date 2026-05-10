import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';
import * as response from '../utils/response';

export const validate = (schema: z.Schema<any>) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return response.error(
          res, 
          'Validation failed', 
          'VALIDATION_ERROR', 
          400
        );
      }
      next(error);
    }
  };
};
