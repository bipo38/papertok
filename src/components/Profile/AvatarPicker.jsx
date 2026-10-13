import { useEffect, useId, useRef, useState } from 'react';
import { Camera } from '@phosphor-icons/react';
import { Button } from '../ui/button.jsx';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '../ui/dialog.jsx';
import { Slider } from '../ui/slider.jsx';
import {
  PUBLIC_AVATAR_PRESET,
  prepareProfileImage,
  validateProfileImageMetadata,
} from '../../utils/profileImage.js';
import { clampOffset, cropFromView } from '../../utils/avatarCrop.js';
import { getUiErrorMessage } from '../../utils/errorMessages.js';
import './AvatarPicker.css';

const ACCEPT = 'image/png,image/jpeg,image/webp';
const MIN_ZOOM = 1;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.1;
const CENTRED = { scale: 1, offsetX: 0, offsetY: 0 };

const copy = {
  choose: 'Choose a photo',
  change: 'Change photo',
  caption: 'PNG, JPEG or WebP, up to 8 MB',
  adjust: 'Adjust',
  remove: 'Remove',
  dropHint: 'Drop to use this photo',
  title: 'Adjust your photo',
  description: 'Drag to reposition. Use the slider or the arrow keys to zoom and nudge.',
  viewport: 'Photo position',
  zoom: 'Zoom',
  cancel: 'Cancel',
  use: 'Use photo',
  preparing: 'Preparing…',
};

/**
 * The profile photo control: the round avatar opens a file (or takes a dropped
 * one), the crop dialog frames it, and the host receives both prepared data
 * URLs — the account one and the smaller public one — cut from the same crop.
 * The file travels in the value too (`value.file`), so "Adjust" can reopen
 * the same photo after the host has unmounted and remounted the control; the
 * host stores the value whole and never reads the file.
 */
export function AvatarPicker({
  value,
  fallbackSrc = '',
  initial = '',
  size = 96,
  disabled = false,
  onChange,
}) {
  const errorId = useId();
  const inputRef = useRef(null);
  const viewportRef = useRef(null);
  const dragRef = useRef(null);
  const runRef = useRef(0);

  // The file behind the current value, so "Adjust" can reopen it.
  const sourceFile = value?.file instanceof File ? value.file : null;
  // The file in the dialog and its object URL; kept through the exit animation.
  const [editing, setEditing] = useState(null);
  const [open, setOpen] = useState(false);
  const [natural, setNatural] = useState(null);
  const [view, setView] = useState(CENTRED);
  const [dragging, setDragging] = useState(false);
  const [dropping, setDropping] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [error, setError] = useState('');
  const [dialogError, setDialogError] = useState('');

  const editingUrl = editing?.url;
  useEffect(() => () => {
    if (editingUrl) URL.revokeObjectURL(editingUrl);
  }, [editingUrl]);

  // A preparation still running when the picker unmounts must not report back.
  useEffect(() => () => { runRef.current += 1; }, []);

  const shownSrc = value?.account || fallbackSrc;

  const openEditor = (file) => {
    setEditing({ file, url: URL.createObjectURL(file) });
    setNatural(null);
    setView(CENTRED);
    setDialogError('');
    setOpen(true);
  };

  const takeFile = (file) => {
    if (!file || disabled) return;
    try {
      validateProfileImageMetadata(file);
    } catch (validationError) {
      setError(getUiErrorMessage(validationError, 'PROFILE_PHOTO_SAVE_FAILED'));
      return;
    }
    setError('');
    openEditor(file);
  };

  const handleInput = (event) => {
    const file = event.target.files?.[0];
    // Cleared so choosing the same file again still fires a change.
    event.target.value = '';
    takeFile(file);
  };

  const handleDragOver = (event) => {
    if (disabled || !event.dataTransfer?.types?.includes('Files')) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    setDropping(true);
  };

  const handleDrop = (event) => {
    if (disabled) return;
    event.preventDefault();
    setDropping(false);
    takeFile(event.dataTransfer?.files?.[0]);
  };

  const viewSize = () => viewportRef.current?.clientWidth || 0;

  const moveTo = (next) => {
    if (!natural) return;
    const size = viewSize();
    setView((current) => {
      const scale = Math.min(Math.max(next.scale ?? current.scale, MIN_ZOOM), MAX_ZOOM);
      // A zoom scales the offsets too, so the point under the circle's centre stays put.
      const ratio = scale / current.scale;
      return {
        scale,
        ...clampOffset({
          viewSize: size,
          naturalWidth: natural.width,
          naturalHeight: natural.height,
          scale,
          offsetX: next.offsetX ?? current.offsetX * ratio,
          offsetY: next.offsetY ?? current.offsetY * ratio,
        }),
      };
    });
  };

  const handlePointerDown = (event) => {
    if (!natural || event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      offsetX: view.offsetX,
      offsetY: view.offsetY,
    };
    setDragging(true);
  };

  const handlePointerMove = (event) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    moveTo({
      offsetX: drag.offsetX + event.clientX - drag.startX,
      offsetY: drag.offsetY + event.clientY - drag.startY,
    });
  };

  const endDrag = (event) => {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    dragRef.current = null;
    setDragging(false);
  };

  const handleViewportKey = (event) => {
    const step = event.shiftKey ? 10 : 2;
    const moves = {
      ArrowLeft: { offsetX: view.offsetX - step },
      ArrowRight: { offsetX: view.offsetX + step },
      ArrowUp: { offsetY: view.offsetY - step },
      ArrowDown: { offsetY: view.offsetY + step },
      '+': { scale: view.scale + ZOOM_STEP },
      '=': { scale: view.scale + ZOOM_STEP },
      '-': { scale: view.scale - ZOOM_STEP },
      _: { scale: view.scale - ZOOM_STEP },
    };
    const next = moves[event.key];
    if (!next) return;
    event.preventDefault();
    moveTo(next);
  };

  const handleOpenChange = (next) => {
    if (next) return;
    runRef.current += 1;
    setPreparing(false);
    setOpen(false);
  };

  const handleUse = async () => {
    if (preparing || !editing || !natural) return;
    const run = ++runRef.current;
    const crop = cropFromView({
      viewSize: viewSize(),
      naturalWidth: natural.width,
      naturalHeight: natural.height,
      ...view,
    });
    setPreparing(true);
    setDialogError('');
    try {
      const [account, publicPhoto] = await Promise.all([
        prepareProfileImage(editing.file, { crop }),
        prepareProfileImage(editing.file, { ...PUBLIC_AVATAR_PRESET, crop }),
      ]);
      if (run !== runRef.current) return;
      setPreparing(false);
      setOpen(false);
      onChange?.({ account, public: publicPhoto, file: editing.file });
    } catch (prepareError) {
      if (run !== runRef.current) return;
      setPreparing(false);
      setDialogError(getUiErrorMessage(prepareError, 'PROFILE_PHOTO_SAVE_FAILED'));
    }
  };

  const handleRemove = () => {
    setError('');
    onChange?.(null);
  };

  const imageStyle = natural
    ? {
      width: `${(natural.width / Math.min(natural.width, natural.height)) * 100}%`,
      transform: `translate(calc(-50% + ${view.offsetX}px), calc(-50% + ${view.offsetY}px)) scale(${view.scale})`,
    }
    : undefined;

  return (
    <div className="avatar-picker" style={{ '--avatar-size': `${size}px` }}>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        onChange={handleInput}
        tabIndex={-1}
        aria-hidden="true"
        hidden
      />
      <button
        type="button"
        className="avatar-picker-button"
        aria-label={value ? copy.change : copy.choose}
        aria-describedby={error ? errorId : undefined}
        disabled={disabled}
        data-dragging={dropping ? '' : undefined}
        onClick={() => inputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={() => setDropping(false)}
        onDrop={handleDrop}
      >
        <span className="avatar-picker-face">
          {shownSrc ? (
            <img src={shownSrc} alt="" referrerPolicy="no-referrer" decoding="async" />
          ) : (
            <span className="avatar-picker-initial" aria-hidden="true">{initial}</span>
          )}
        </span>
        <span className="avatar-picker-badge" aria-hidden="true">
          <Camera weight="fill" />
        </span>
      </button>
      <span className="sr-only" role="status" aria-live="polite">
        {dropping ? copy.dropHint : ''}
      </span>

      <p className="avatar-picker-caption">{copy.caption}</p>
      {error && (
        <p id={errorId} className="avatar-picker-error" role="alert">{error}</p>
      )}

      {value && (
        <div className="avatar-picker-actions">
          {sourceFile && (
            <Button
              variant="ghost"
              size="sm"
              disabled={disabled}
              onClick={() => openEditor(sourceFile)}
            >
              {copy.adjust}
            </Button>
          )}
          <Button variant="ghost" size="sm" disabled={disabled} onClick={handleRemove}>
            {copy.remove}
          </Button>
        </div>
      )}

      <Dialog
        open={open}
        onOpenChange={handleOpenChange}
        onOpenChangeComplete={(next) => { if (!next) setEditing(null); }}
      >
        <DialogContent className="avatar-crop-dialog">
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>{copy.description}</DialogDescription>

          <div
            ref={viewportRef}
            className="avatar-crop-viewport"
            role="group"
            aria-label={copy.viewport}
            tabIndex={0}
            data-dragging={dragging ? '' : undefined}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            onKeyDown={handleViewportKey}
          >
            {editing && (
              <img
                className="avatar-crop-image"
                src={editing.url}
                alt=""
                draggable={false}
                style={imageStyle}
                data-ready={natural ? '' : undefined}
                onError={() => setDialogError(getUiErrorMessage(new Error('undecodable image'), 'PROFILE_PHOTO_SAVE_FAILED'))}
                onLoad={(event) => setNatural({
                  width: event.currentTarget.naturalWidth,
                  height: event.currentTarget.naturalHeight,
                })}
              />
            )}
            <span className="avatar-crop-mask" aria-hidden="true" />
          </div>

          <div className="avatar-crop-zoom">
            <span className="avatar-crop-zoom-label" aria-hidden="true">{copy.zoom}</span>
            <Slider
              value={view.scale}
              min={MIN_ZOOM}
              max={MAX_ZOOM}
              step={0.01}
              largeStep={0.25}
              disabled={!natural}
              getAriaLabel={() => copy.zoom}
              onValueChange={(scale) => moveTo({ scale })}
            />
          </div>

          {dialogError && (
            <p className="avatar-picker-error" role="alert">{dialogError}</p>
          )}

          <div className="avatar-crop-actions">
            <Button variant="outline" onClick={() => handleOpenChange(false)}>
              {copy.cancel}
            </Button>
            <Button
              variant="default"
              aria-disabled={preparing || !natural ? 'true' : undefined}
              onClick={handleUse}
            >
              {preparing ? copy.preparing : copy.use}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
