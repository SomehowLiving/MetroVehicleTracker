import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Camera, X } from "lucide-react";
import { useCamera } from "@/hooks/use-camera";
import { useEffect } from "react";

interface CameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (photoDataUrl: string) => void;
  title?: string;
}

export default function CameraModal({ isOpen, onClose, onCapture, title = "Capture Photo" }: CameraModalProps) {
  const { videoRef, canvasRef, error, openCamera, closeCamera, capturePhoto } = useCamera();

  useEffect(() => {
    if (isOpen) {
      openCamera();
    } else {
      closeCamera();
    }
  }, [isOpen, openCamera, closeCamera]);

  const handleCapture = () => {
    const photoDataUrl = capturePhoto();
    if (photoDataUrl) {
      onCapture(photoDataUrl);
      onClose();
    }
  };

  const handleClose = () => {
    closeCamera();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            {title}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <div className="relative">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full h-64 bg-gray-200 rounded-lg object-cover"
            />
            <canvas
              ref={canvasRef}
              className="hidden"
            />
          </div>
          
          <div className="flex justify-end space-x-3">
            <Button variant="outline" onClick={handleClose}>
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button 
              onClick={handleCapture}
              className="bg-metro-blue hover:bg-metro-deep-blue"
              disabled={!!error}
            >
              <Camera className="mr-2 h-4 w-4" />
              Capture
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
