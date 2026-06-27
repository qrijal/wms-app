interface AlertProps {
  type: 'error' | 'success' | 'info';
  message: string;
  onClose?: () => void;
}

export default function Alert({ type, message, onClose }: AlertProps) {
  const colors = {
    error: 'bg-red-50 text-red-700 border-red-200',
    success: 'bg-green-50 text-green-700 border-green-200',
    info: 'bg-blue-50 text-blue-700 border-blue-200',
  };
  return (
    <div className={`p-3 rounded border mb-4 flex justify-between items-center ${colors[type]}`}>
      <span>{message}</span>
      {onClose && <button onClick={onClose} className="ml-2 font-bold">&times;</button>}
    </div>
  );
}