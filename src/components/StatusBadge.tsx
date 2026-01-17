import { EstadoRegistro } from '@/types/database';
import { CheckCircle, Clock, XCircle } from 'lucide-react';

interface StatusBadgeProps {
  estado: EstadoRegistro;
}

export function StatusBadge({ estado }: StatusBadgeProps) {
  const config = {
    PENDIENTE: {
      className: 'status-badge status-pendiente',
      icon: Clock,
      label: 'Pendiente',
    },
    APROBADO: {
      className: 'status-badge status-aprobado',
      icon: CheckCircle,
      label: 'Aprobado',
    },
    RECHAZADO: {
      className: 'status-badge status-rechazado',
      icon: XCircle,
      label: 'Rechazado',
    },
  };

  const { className, icon: Icon, label } = config[estado];

  return (
    <span className={className}>
      <Icon className="w-3.5 h-3.5" />
      {label}
    </span>
  );
}
