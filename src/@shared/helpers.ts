import { Response } from "express";

type TSendResponseInput = {
  response: Response;
  status_code: number;
  message?: string;
  data?: any;
  error?: any;
};

export const sendResponse = ({
  response,
  status_code,
  message,
  data,
  error,
}: TSendResponseInput) => {
  return response
    .status(status_code)
    .json({ status_code, message, data, error });
};
