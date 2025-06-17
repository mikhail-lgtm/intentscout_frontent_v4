import React, { useState } from 'react'
import { X, Plus, Settings, Play, Pause, Archive, Copy, Trash2, Edit } from 'lucide-react'
import { useSequences } from '../../hooks/useSequences'
import { Sequence, SequenceStatus } from '../../types/sequences'
import { SequenceEditor } from './SequenceEditor'
import { ConfirmationModal } from '../ui/ConfirmationModal'

interface SequenceBuilderProps {
  isOpen: boolean
  onClose: () => void
}

export const SequenceBuilder: React.FC<SequenceBuilderProps> = ({ isOpen, onClose }) => {
  const { sequences, isLoading, error, createSequence, deleteSequence, duplicateSequence, updateSequenceStatus, clearError } = useSequences()
  const [editingSequence, setEditingSequence] = useState<Sequence | null>(null)
  const [showEditor, setShowEditor] = useState(false)
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean
    sequenceId: string
    sequenceName: string
  }>({
    isOpen: false,
    sequenceId: '',
    sequenceName: ''
  })

  if (!isOpen) return null

  const getStatusColor = (status: SequenceStatus) => {
    switch (status) {
      case SequenceStatus.ACTIVE:
        return 'bg-green-100 text-green-700 border-green-200'
      case SequenceStatus.PAUSED:
        return 'bg-yellow-100 text-yellow-700 border-yellow-200'
      case SequenceStatus.ARCHIVED:
        return 'bg-gray-100 text-gray-700 border-gray-200'
      default: // DRAFT
        return 'bg-blue-100 text-blue-700 border-blue-200'
    }
  }

  const getStatusIcon = (status: SequenceStatus) => {
    switch (status) {
      case SequenceStatus.ACTIVE:
        return <Play className="w-3 h-3" />
      case SequenceStatus.PAUSED:
        return <Pause className="w-3 h-3" />
      case SequenceStatus.ARCHIVED:
        return <Archive className="w-3 h-3" />
      default: // DRAFT
        return <Edit className="w-3 h-3" />
    }
  }

  const handleCreateSequence = () => {
    setEditingSequence(null)
    setShowEditor(true)
  }

  const handleEditSequence = (sequence: Sequence) => {
    setEditingSequence(sequence)
    setShowEditor(true)
  }

  const handleDeleteSequence = (sequenceId: string, sequenceName: string) => {
    setDeleteConfirmation({
      isOpen: true,
      sequenceId,
      sequenceName
    })
  }

  const executeDeleteSequence = async () => {
    if (deleteConfirmation.sequenceId) {
      await deleteSequence(deleteConfirmation.sequenceId)
    }
  }

  const handleDuplicateSequence = async (sequenceId: string) => {
    await duplicateSequence(sequenceId)
  }

  const handleStatusChange = async (sequenceId: string, newStatus: SequenceStatus) => {
    await updateSequenceStatus(sequenceId, newStatus)
  }

  const handleEditorClose = () => {
    setShowEditor(false)
    setEditingSequence(null)
  }

  // If showing editor, render that instead
  if (showEditor) {
    return (
      <SequenceEditor
        isOpen={true}
        onClose={handleEditorClose}
        sequence={editingSequence}
      />
    )
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50" onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                <Settings className="w-4 h-4 text-orange-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Sequence Builder</h2>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleCreateSequence}
                className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium"
              >
                <Plus className="w-4 h-4" />
                New Sequence
              </button>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex justify-between items-center">
                  <p className="text-red-700 text-sm">{error}</p>
                  <button
                    onClick={clearError}
                    className="text-red-500 hover:text-red-700"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {isLoading ? (
              // Loading skeleton
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="border border-gray-200 rounded-lg p-6 animate-pulse">
                    <div className="h-6 bg-gray-200 rounded mb-3"></div>
                    <div className="h-4 bg-gray-200 rounded mb-4 w-3/4"></div>
                    <div className="flex justify-between items-center">
                      <div className="h-5 bg-gray-200 rounded w-16"></div>
                      <div className="h-8 bg-gray-200 rounded w-20"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : sequences.length === 0 ? (
              // Empty state
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Settings className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No sequences yet</h3>
                <p className="text-gray-600 mb-6">Create your first sequence to start automating your outreach</p>
                <button
                  onClick={handleCreateSequence}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium"
                >
                  <Plus className="w-4 h-4" />
                  Create First Sequence
                </button>
              </div>
            ) : (
              // Sequences grid
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {sequences.map((sequence) => (
                  <div
                    key={sequence.id}
                    className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
                  >
                    {/* Sequence header */}
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="font-semibold text-gray-900 text-lg truncate pr-2">
                        {sequence.name}
                      </h3>
                      <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(sequence.status)}`}>
                        {getStatusIcon(sequence.status)}
                        {sequence.status}
                      </span>
                    </div>

                    {/* Description */}
                    {sequence.description && (
                      <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                        {sequence.description}
                      </p>
                    )}

                    {/* Stats */}
                    <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                      <span>{sequence.blocks.length} step{sequence.blocks.length !== 1 ? 's' : ''}</span>
                      <span>Updated {new Date(sequence.updated_at || '').toLocaleDateString()}</span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEditSequence(sequence)}
                        className="flex-1 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDuplicateSequence(sequence.id!)}
                        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Duplicate"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteSequence(sequence.id!, sequence.name)}
                        className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={deleteConfirmation.isOpen}
        onClose={() => setDeleteConfirmation({ ...deleteConfirmation, isOpen: false })}
        onConfirm={executeDeleteSequence}
        title="Delete Sequence"
        message={`Are you sure you want to delete "${deleteConfirmation.sequenceName}"? This action cannot be undone.`}
        variant="danger"
        confirmText="Delete"
        cancelText="Cancel"
      />
    </>
  )
}