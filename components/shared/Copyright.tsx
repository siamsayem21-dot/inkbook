interface Props {
  className?: string;
}

export default function Copyright({ className = "text-xs text-gray-500" }: Props) {
  return <p className={`text-center ${className}`}>Copyright © 2026 InkBook</p>;
}
