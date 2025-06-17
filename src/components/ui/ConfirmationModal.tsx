import React from 'react'
import { AlertTriangle, CheckCircle, Info, XCircle } from 'lucide-react'

interface ConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: 'warning' | 'danger' | 'info' | 'success'
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'warning'
}) => {
  if (!isOpen) return null

  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          icon: <XCircle className="w-6 h-6 text-red-500" />,
          confirmButton: 'bg-red-500 hover:bg-red-600 text-white',
          border: 'border-red-100'
        }
      case 'success':
        return {
          icon: <CheckCircle className="w-6 h-6 text-green-500" />,
          confirmButton: 'bg-green-500 hover:bg-green-600 text-white',
          border: 'border-green-100'
        }
      case 'info':
        return {
          icon: <Info className="w-6 h-6 text-blue-500" />,
          confirmButton: 'bg-blue-500 hover:bg-blue-600 text-white',
          border: 'border-blue-100'
        }
      default: // warning
        return {
          icon: <AlertTriangle className="w-6 h-6 text-orange-500" />,
          confirmButton: 'bg-orange-500 hover:bg-orange-600 text-white',
          border: 'border-orange-100'
        }
    }
  }

  const styles = getVariantStyles()

  const handleConfirm = () => {
    onConfirm()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-25 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div 
        className={`bg-white rounded-2xl shadow-2xl max-w-sm w-full mx-4 border ${styles.border} transform transition-all duration-200 scale-100`}
        style={{
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)'
        }}
      >
        <div className="p-6">
          {/* Icon and Title */}
          <div className="flex items-center gap-3 mb-4">
            {styles.icon}
            <h3 className="text-lg font-semibold text-gray-900 leading-none">
              {title}
            </h3>
          </div>

          {/* Message */}
          <p className="text-gray-600 text-sm leading-relaxed mb-6">
            {message}
          </p>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors text-sm"
            >
              {cancelText}
            </button>
            <button
              onClick={handleConfirm}
              className={`flex-1 px-4 py-2.5 rounded-lg font-medium transition-colors text-sm ${styles.confirmButton}`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}