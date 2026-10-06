import { useEffect } from "react";

export default function ImageLightbox({ src, alt = "Ảnh xem chi tiết", onClose }) {
  useEffect(() => {
    const closeOnEscape = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  if (!src) return null;
  return (
    <div className="image-lightbox" role="dialog" aria-modal="true" aria-label={alt} onClick={onClose}>
      <button type="button" className="image-lightbox-close" onClick={onClose} aria-label="Đóng ảnh xem chi tiết">×</button>
      <img src={src} alt={alt} onClick={(event) => event.stopPropagation()} />
      <p>Chạm bên ngoài hoặc nhấn Esc để đóng</p>
    </div>
  );
}
