import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:rounded-xl group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-tile-line group-[.toaster]:shadow-[0_20px_45px_-24px_hsl(0_0%_0%/0.4)]",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:rounded-lg group-[.toast]:bg-foreground group-[.toast]:text-background",
          cancelButton:
            "group-[.toast]:rounded-lg group-[.toast]:bg-tile-soft group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export { Toaster, toast };
