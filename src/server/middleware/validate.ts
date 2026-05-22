import { z, ZodError } from "zod";
import { Request, Response, NextFunction } from "express";

export const validate = (schema: z.ZodSchema<any>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error: any) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          error: "Validation failed",
          details: (error as any).errors,
        });
      }
      next(error);
    }
  };
};
