interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export default function Input({ label, className = '', ...props }: InputProps) {
  return (
    <div className="mb-3">
      {label && <label className="block text-sm font-medium mb-1">{label}</label>}
      <input className={`w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${className}`} {...props} />
    </div>
  );
}