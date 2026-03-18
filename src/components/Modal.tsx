import React from "react";
import { X } from "lucide-react";

interface ModalProps {
  isOpen: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, title, onClose, children }) => {
  if (!isOpen) return null;
  return (
  <div className="modal-overlay" onClick={onClose}>
    <div className="modal" onClick={e => e.stopPropagation()}>
      <div className="modal-header">
        <span className="modal-title">{title}</span>
        <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ padding: "4px 8px" }}>
          <X size={16} />
        </button>
      </div>
      {children}
    </div>
  </div>
  );
};
