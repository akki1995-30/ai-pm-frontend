import React from "react";
import { X } from "lucide-react";
import logger from "../lib/logger";

interface ModalProps {
  isOpen: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, title, onClose, children }) => {
  if (!isOpen) return null;
  logger.debug("Modal", `[${title}] opened`);
  const handleClose = () => {
    logger.debug("Modal", `[${title}] close requested`);
    onClose();
  };
  return (
  <div className="modal-overlay" onClick={handleClose}>
    <div className="modal" onClick={e => e.stopPropagation()}>
      <div className="modal-header">
        <span className="modal-title">{title}</span>
        <button className="btn btn-ghost btn-sm" onClick={handleClose} style={{ padding: "4px 8px" }}>
          <X size={16} />
        </button>
      </div>
      {children}
    </div>
  </div>
  );
};
