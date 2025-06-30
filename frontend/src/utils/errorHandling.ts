import { toast } from 'react-toastify';

export class APIError extends Error {
  constructor(
    message: string,
    public status?: number,
    public data?: any
  ) {
    super(message);
    this.name = 'APIError';
  }
}

export const handleError = (error: unknown) => {
  if (error instanceof APIError) {
    toast.error(error.message);
    return;
  }

  if (error instanceof Error) {
    toast.error(error.message);
    return;
  }

  toast.error('An unexpected error occurred');
};

export const handleSuccess = (message: string) => {
  toast.success(message);
};

export const handleInfo = (message: string) => {
  toast.info(message);
};

export const handleWarning = (message: string) => {
  toast.warning(message);
}; 