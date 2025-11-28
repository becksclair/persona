/**
 * Toast hook using sonner for user feedback.
 */

import { toast as sonnerToast } from "sonner";

interface ToastOptions {
  title: string;
  description?: string;
  variant?: "default" | "destructive" | "success";
  action?: {
    label: string;
    onClick: () => void;
  };
  duration?: number;
}

export function useToast() {
  const toast = (options: ToastOptions) => {
    const { title, description, variant, action, duration } = options;

    const toastOptions = {
      description,
      duration: duration ?? 5000,
      action: action
        ? {
            label: action.label,
            onClick: action.onClick,
          }
        : undefined,
    };

    switch (variant) {
      case "destructive":
        sonnerToast.error(title, toastOptions);
        break;
      case "success":
        sonnerToast.success(title, toastOptions);
        break;
      default:
        sonnerToast(title, toastOptions);
    }
  };

  return { toast };
}

// Re-export sonner's toast for direct usage
export { toast as sonnerToast } from "sonner";
