import React, { useState, useEffect } from 'react'
import { X, Plus, Save, Mail, MessageCircle, UserPlus, Phone, CheckSquare, Clock, Settings, ChevronDown, ChevronUp, GripVertical } from 'lucide-react'
import { useSequences } from '../../hooks/useSequences'
import { Sequence, SequenceBlock, SequenceBlockType, SequenceDelayUnit, BLOCK_TEMPLATES } from '../../types/sequences'
import { BlockEditor } from './BlockEditor'

interface SequenceEditorProps {
  isOpen: boolean
  onClose: () => void
  sequence?: Sequence | null
}

export const SequenceEditor: React.FC<SequenceEditorProps> = ({ isOpen, onClose, sequence }) => {
  const { createSequence, updateSequence } = useSequences()
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    blocks: [] as SequenceBlock[]
  })
  const [editingBlock, setEditingBlock] = useState<SequenceBlock | null>(null)
  const [showBlockEditor, setShowBlockEditor] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [expandedBlocks, setExpandedBlocks] = useState<Set<string>>(new Set())
  
  // Drag and drop state - following their existing patterns
  const [dragState, setDragState] = useState({
    isDragging: false,
    draggedBlockId: null as string | null,
    draggedIndex: null as number | null,
    dropIndicatorIndex: null as number | null,
    dragStartPos: { x: 0, y: 0 },
    currentPos: { x: 0, y: 0 }
  })

  // Initialize form data when sequence changes
  useEffect(() => {
    if (sequence) {
      setFormData({
        name: sequence.name,
        description: sequence.description || '',
        blocks: sequence.blocks
      })
    } else {
      setFormData({
        name: '',
        description: '',
        blocks: []
      })
    }
  }, [sequence])

  if (!isOpen) return null

  const getBlockIcon = (type: SequenceBlockType) => {
    switch (type) {
      case SequenceBlockType.EMAIL:
        return <Mail className="w-5 h-5" />
      case SequenceBlockType.LINKEDIN_MESSAGE:
        return <MessageCircle className="w-5 h-5" />
      case SequenceBlockType.LINKEDIN_CONNECTION:
        return <UserPlus className="w-5 h-5" />
      case SequenceBlockType.PHONE_CALL:
        return <Phone className="w-5 h-5" />
      case SequenceBlockType.TASK:
        return <CheckSquare className="w-5 h-5" />
      case SequenceBlockType.WAIT:
        return <Clock className="w-5 h-5" />
      default:
        return <Settings className="w-5 h-5" />
    }
  }

  const getBlockColor = (type: SequenceBlockType) => {
    switch (type) {
      case SequenceBlockType.EMAIL:
        return 'bg-blue-50 border-blue-200 text-blue-700'
      case SequenceBlockType.LINKEDIN_MESSAGE:
        return 'bg-indigo-50 border-indigo-200 text-indigo-700'
      case SequenceBlockType.LINKEDIN_CONNECTION:
        return 'bg-purple-50 border-purple-200 text-purple-700'
      case SequenceBlockType.PHONE_CALL:
        return 'bg-green-50 border-green-200 text-green-700'
      case SequenceBlockType.TASK:
        return 'bg-orange-50 border-orange-200 text-orange-700'
      case SequenceBlockType.WAIT:
        return 'bg-gray-50 border-gray-200 text-gray-700'
      default:
        return 'bg-gray-50 border-gray-200 text-gray-700'
    }
  }

  const formatDelayText = (value: number, unit: SequenceDelayUnit) => {
    if (value === 0) return 'Immediately'
    const unitText = value === 1 ? unit.replace('s', '') : unit
    return `${value} ${unitText}`
  }

  const addBlock = (type: SequenceBlockType) => {
    const template = BLOCK_TEMPLATES[type]
    const newBlock: SequenceBlock = {
      id: `block_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      step_number: formData.blocks.length + 1,
      block_type: type,
      name: template.name || 'New Block',
      delay_value: template.delay_value || 0,
      delay_unit: template.delay_unit || SequenceDelayUnit.DAYS,
      config: template.config || {}
    }

    setFormData(prev => ({
      ...prev,
      blocks: [...prev.blocks, newBlock]
    }))
  }

  const editBlock = (block: SequenceBlock) => {
    setEditingBlock(block)
    setShowBlockEditor(true)
  }

  const updateBlock = (updatedBlock: SequenceBlock) => {
    setFormData(prev => ({
      ...prev,
      blocks: prev.blocks.map(block => 
        block.id === updatedBlock.id ? updatedBlock : block
      )
    }))
  }

  const deleteBlock = (blockId: string) => {
    setFormData(prev => ({
      ...prev,
      blocks: prev.blocks.filter(block => block.id !== blockId)
        .map((block, index) => ({ ...block, step_number: index + 1 }))
    }))
  }

  const toggleBlockExpansion = (blockId: string) => {
    setExpandedBlocks(prev => {
      const newSet = new Set(prev)
      if (newSet.has(blockId)) {
        newSet.delete(blockId)
      } else {
        newSet.add(blockId)
      }
      return newSet
    })
  }

  const handleSave = async () => {
    if (!formData.name.trim()) {
      alert('Please enter a sequence name')
      return
    }

    setIsSaving(true)
    try {
      if (sequence?.id) {
        // Update existing sequence
        const result = await updateSequence(sequence.id, formData)
        if (!result) {
          throw new Error('Failed to update sequence')
        }
      } else {
        // Create new sequence
        const result = await createSequence(formData)
        if (!result) {
          throw new Error('Failed to create sequence')
        }
      }
      onClose()
    } catch (error) {
      console.error('Failed to save sequence:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      alert(`Failed to save sequence: ${errorMessage}`)
    } finally {
      setIsSaving(false)
    }
  }

  const handleBlockEditorClose = () => {
    setShowBlockEditor(false)
    setEditingBlock(null)
  }

  const handleBlockEditorSave = async (updatedBlock: SequenceBlock): Promise<void> => {
    // Update local state first
    updateBlock(updatedBlock)
    
    // If this is an existing sequence, save to backend immediately
    if (sequence?.id) {
      const updatedFormData = {
        ...formData,
        blocks: formData.blocks.map(block => 
          block.id === updatedBlock.id ? updatedBlock : block
        )
      }
      
      const success = await updateSequence(sequence.id, updatedFormData)
      if (!success) {
        throw new Error('Failed to save sequence to backend')
      }
    }
    // Note: BlockEditor will close itself after successful save
  }

  // Mouse-based drag and drop handlers - following their patterns
  const handleMouseDown = (e: React.MouseEvent, blockId: string) => {
    e.preventDefault()
    const blockIndex = formData.blocks.findIndex(block => block.id === blockId)
    
    setDragState({
      isDragging: true,
      draggedBlockId: blockId,
      draggedIndex: blockIndex,
      dropIndicatorIndex: null,
      dragStartPos: { x: e.clientX, y: e.clientY },
      currentPos: { x: e.clientX, y: e.clientY }
    })
  }

  // Mouse move handler for drag operations
  const handleMouseMove = (e: MouseEvent) => {
    if (!dragState.isDragging) return
    
    // Update current position
    setDragState(prev => ({
      ...prev,
      currentPos: { x: e.clientX, y: e.clientY }
    }))

    // Calculate drop position
    const container = document.querySelector('[data-sequence-container]') as HTMLElement
    if (!container) return

    const rect = container.getBoundingClientRect()
    const mouseY = e.clientY - rect.top
    
    // Find the closest drop position
    const blockElements = container.querySelectorAll('[data-block-id]')
    
    if (blockElements.length === 0) {
      setDragState(prev => ({ ...prev, dropIndicatorIndex: 0 }))
      return
    }

    let closestIndex = 0
    let closestDistance = Infinity

    // Check if mouse is above the first block
    const firstBlockRect = blockElements[0].getBoundingClientRect()
    const firstBlockTop = firstBlockRect.top - rect.top
    
    if (mouseY < firstBlockTop) {
      setDragState(prev => ({ ...prev, dropIndicatorIndex: 0 }))
      return
    }

    // Check between blocks
    blockElements.forEach((blockEl, index) => {
      const blockRect = blockEl.getBoundingClientRect()
      const blockCenterY = blockRect.top + blockRect.height / 2 - rect.top
      const distance = Math.abs(mouseY - blockCenterY)
      
      if (distance < closestDistance) {
        closestDistance = distance
        closestIndex = mouseY < blockCenterY ? index : index + 1
      }
    })

    // Don't show indicator if dropping in same position
    if (dragState.draggedIndex !== null && 
        (closestIndex === dragState.draggedIndex || closestIndex === dragState.draggedIndex + 1)) {
      setDragState(prev => ({ ...prev, dropIndicatorIndex: null }))
    } else {
      setDragState(prev => ({ ...prev, dropIndicatorIndex: closestIndex }))
    }
  }

  // Mouse up handler to complete drag
  const handleMouseUp = () => {
    if (!dragState.isDragging) return

    const { draggedIndex, dropIndicatorIndex, draggedBlockId } = dragState
    
    if (draggedBlockId && dropIndicatorIndex !== null && draggedIndex !== null) {
      let targetIndex = dropIndicatorIndex
      if (draggedIndex < dropIndicatorIndex) {
        targetIndex = dropIndicatorIndex - 1
      }

      if (draggedIndex !== targetIndex) {
        // Reorder the blocks
        const newBlocks = [...formData.blocks]
        const [draggedBlock] = newBlocks.splice(draggedIndex, 1)
        newBlocks.splice(targetIndex, 0, draggedBlock)

        // Update step numbers
        const updatedBlocks = newBlocks.map((block, index) => ({
          ...block,
          step_number: index + 1
        }))

        setFormData(prev => ({
          ...prev,
          blocks: updatedBlocks
        }))
      }
    }

    // Reset drag state
    setDragState({
      isDragging: false,
      draggedBlockId: null,
      draggedIndex: null,
      dropIndicatorIndex: null,
      dragStartPos: { x: 0, y: 0 },
      currentPos: { x: 0, y: 0 }
    })
  }

  // Add event listeners for mouse move and up
  useEffect(() => {
    if (dragState.isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = 'grabbing'
      document.body.style.userSelect = 'none'
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
      }
    }
  }, [dragState.isDragging, handleMouseMove, handleMouseUp])

  // Update block delay inline
  const updateBlockDelay = (blockId: string, delayValue: number, delayUnit: SequenceDelayUnit) => {
    setFormData(prev => ({
      ...prev,
      blocks: prev.blocks.map(block => 
        block.id === blockId 
          ? { ...block, delay_value: delayValue, delay_unit: delayUnit }
          : block
      )
    }))
  }

  // Calculate drop indicator position
  const getDropIndicatorPosition = () => {
    if (dragState.dropIndicatorIndex === null) return 0
    
    const container = document.querySelector('[data-sequence-container]')
    if (!container) return 0
    
    const blockElements = container.querySelectorAll('[data-block-id]')
    
    if (dragState.dropIndicatorIndex === 0) {
      // Position at the top
      return 0
    }
    
    if (dragState.dropIndicatorIndex > blockElements.length) {
      // Position at the bottom
      const lastBlock = blockElements[blockElements.length - 1] as HTMLElement
      if (lastBlock) {
        return lastBlock.offsetTop + lastBlock.offsetHeight + 12 // 12px spacing
      }
    }
    
    // Position between blocks
    const targetBlock = blockElements[dragState.dropIndicatorIndex - 1] as HTMLElement
    if (targetBlock) {
      return targetBlock.offsetTop + targetBlock.offsetHeight + 6 // Half spacing
    }
    
    return 0
  }

  // If showing block editor, render that instead
  if (showBlockEditor && editingBlock) {
    return (
      <BlockEditor
        isOpen={true}
        onClose={handleBlockEditorClose}
        onSave={handleBlockEditorSave}
        block={editingBlock}
      />
    )
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50" />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                <Settings className="w-4 h-4 text-orange-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">
                {sequence ? 'Edit Sequence' : 'Create Sequence'}
              </h2>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save
                  </>
                )}
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
          <div className="flex h-[calc(90vh-80px)]">
            {/* Left Panel - Sequence Info */}
            <div className="w-1/3 border-r border-gray-200 p-6">
              <div className="space-y-6">
                {/* Basic Info */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sequence Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    placeholder="Enter sequence name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    placeholder="Describe this sequence..."
                  />
                </div>

                {/* Add Block Buttons */}
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-3">Add Block</h3>
                  <div className="space-y-2">
                    <button
                      onClick={() => addBlock(SequenceBlockType.EMAIL)}
                      className="w-full flex items-center gap-3 p-3 text-left border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors"
                    >
                      <Mail className="w-5 h-5 text-blue-600" />
                      <div>
                        <div className="font-medium text-gray-900">Email</div>
                        <div className="text-sm text-gray-500">Send an email message</div>
                      </div>
                    </button>
                    <button
                      onClick={() => addBlock(SequenceBlockType.LINKEDIN_MESSAGE)}
                      className="w-full flex items-center gap-3 p-3 text-left border border-gray-200 rounded-lg hover:bg-indigo-50 hover:border-indigo-300 transition-colors"
                    >
                      <MessageCircle className="w-5 h-5 text-indigo-600" />
                      <div>
                        <div className="font-medium text-gray-900">LinkedIn Message</div>
                        <div className="text-sm text-gray-500">Send a LinkedIn message</div>
                      </div>
                    </button>
                    <button
                      onClick={() => addBlock(SequenceBlockType.LINKEDIN_CONNECTION)}
                      className="w-full flex items-center gap-3 p-3 text-left border border-gray-200 rounded-lg hover:bg-purple-50 hover:border-purple-300 transition-colors"
                    >
                      <UserPlus className="w-5 h-5 text-purple-600" />
                      <div>
                        <div className="font-medium text-gray-900">LinkedIn Connect</div>
                        <div className="text-sm text-gray-500">Send connection request</div>
                      </div>
                    </button>
                    <button
                      onClick={() => addBlock(SequenceBlockType.PHONE_CALL)}
                      className="w-full flex items-center gap-3 p-3 text-left border border-gray-200 rounded-lg hover:bg-green-50 hover:border-green-300 transition-colors"
                    >
                      <Phone className="w-5 h-5 text-green-600" />
                      <div>
                        <div className="font-medium text-gray-900">Phone Call</div>
                        <div className="text-sm text-gray-500">Schedule a phone call</div>
                      </div>
                    </button>
                    <button
                      onClick={() => addBlock(SequenceBlockType.TASK)}
                      className="w-full flex items-center gap-3 p-3 text-left border border-gray-200 rounded-lg hover:bg-orange-50 hover:border-orange-300 transition-colors"
                    >
                      <CheckSquare className="w-5 h-5 text-orange-600" />
                      <div>
                        <div className="font-medium text-gray-900">Task</div>
                        <div className="text-sm text-gray-500">Custom task reminder</div>
                      </div>
                    </button>
                    <button
                      onClick={() => addBlock(SequenceBlockType.WAIT)}
                      className="w-full flex items-center gap-3 p-3 text-left border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors"
                    >
                      <Clock className="w-5 h-5 text-gray-600" />
                      <div>
                        <div className="font-medium text-gray-900">Wait</div>
                        <div className="text-sm text-gray-500">Add a delay period</div>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Panel - Sequence Flow */}
            <div className="flex-1 p-6 overflow-y-auto">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Sequence Flow</h3>
                  <span className="text-sm text-gray-500">
                    {formData.blocks.length} step{formData.blocks.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {formData.blocks.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
                    <Settings className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h4 className="text-lg font-medium text-gray-900 mb-2">No steps yet</h4>
                    <p className="text-gray-500">Add blocks from the left panel to build your sequence</p>
                  </div>
                ) : (
                  <div 
                    className="space-y-3 relative"
                    data-sequence-container
                  >
                    {/* Dynamic drop indicator */}
                    {dragState.dropIndicatorIndex !== null && (
                      <div
                        className="absolute left-0 right-0 h-0.5 bg-blue-500 z-30 transition-all duration-150 ease-out shadow-lg"
                        style={{
                          top: `${getDropIndicatorPosition()}px`,
                        }}
                      >
                        {/* Circle indicators at ends */}
                        <div className="absolute -left-1.5 -top-1.5 w-3 h-3 bg-blue-500 rounded-full shadow-md"></div>
                        <div className="absolute -right-1.5 -top-1.5 w-3 h-3 bg-blue-500 rounded-full shadow-md"></div>
                      </div>
                    )}

                    {formData.blocks.map((block, index) => (
                      <div key={block.id} className="relative" data-block-id={block.id}>
                        {/* Delay editor - always show for easy editing */}
                        {index > 0 && (
                          <div className="flex items-center justify-center mb-3">
                            <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-600 text-sm rounded-lg border">
                              <Clock className="w-3 h-3" />
                              <span className="text-xs">Wait</span>
                              <input
                                type="number"
                                min="0"
                                value={block.delay_value}
                                onChange={(e) => updateBlockDelay(block.id, Math.max(0, parseInt(e.target.value) || 0), block.delay_unit)}
                                className="w-12 px-1 py-0.5 text-xs border border-gray-300 rounded text-center bg-white focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
                              />
                              <select
                                value={block.delay_unit}
                                onChange={(e) => updateBlockDelay(block.id, block.delay_value, e.target.value as SequenceDelayUnit)}
                                className="text-xs border border-gray-300 rounded bg-white focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
                              >
                                <option value={SequenceDelayUnit.MINUTES}>min</option>
                                <option value={SequenceDelayUnit.HOURS}>hrs</option>
                                <option value={SequenceDelayUnit.DAYS}>days</option>
                                <option value={SequenceDelayUnit.WEEKS}>wks</option>
                              </select>
                            </div>
                          </div>
                        )}

                        {/* Show either ghost placeholder OR the actual block, never both */}
                        {dragState.draggedBlockId === block.id ? (
                          /* Ghost placeholder when item is being dragged */
                          <div className={`border-2 border-dashed border-gray-300 rounded-lg p-4 ${getBlockColor(block.block_type)} opacity-50 pointer-events-none`}>
                            <div className="flex items-center gap-3">
                              <div className="w-4 h-4 bg-gray-300 rounded"></div>
                              <div className="w-8 h-8 bg-gray-300 rounded-lg"></div>
                              <div>
                                <div className="h-4 bg-gray-300 rounded w-24 mb-1"></div>
                                <div className="h-3 bg-gray-300 rounded w-16"></div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          /* Normal block card */
                          <div 
                            className={`border rounded-lg p-4 ${getBlockColor(block.block_type)} hover:shadow-md transition-all duration-200 cursor-move select-none relative group`}
                        >
                          {/* Small trash can delete button - appears on hover in top right corner */}
                          <button
                            onClick={() => deleteBlock(block.id)}
                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-all duration-200"
                            title="Delete step"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                          
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {/* Drag handle */}
                              <div 
                                className="cursor-grab active:cursor-grabbing p-2 hover:bg-white hover:bg-opacity-70 rounded-md transition-all duration-200 group"
                                onMouseDown={(e) => handleMouseDown(e, block.id)}
                              >
                                <GripVertical className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
                              </div>
                              <div className="flex items-center justify-center w-8 h-8 bg-white rounded-lg">
                                {getBlockIcon(block.block_type)}
                              </div>
                              <div>
                                <div className="font-medium">{block.name}</div>
                                <div className="text-sm opacity-75">Step {block.step_number}</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {/* Only show Edit button for EMAIL blocks */}
                              {block.block_type === 'email' && (
                                <button
                                  onClick={() => editBlock(block)}
                                  className="px-3 py-1.5 text-xs font-medium bg-white hover:bg-gray-50 rounded-md border transition-colors"
                                >
                                  Edit
                                </button>
                              )}
                              <button
                                onClick={() => toggleBlockExpansion(block.id)}
                                className="p-1.5 hover:bg-white hover:bg-opacity-50 rounded-md transition-colors"
                              >
                                {expandedBlocks.has(block.id) ? (
                                  <ChevronUp className="w-4 h-4" />
                                ) : (
                                  <ChevronDown className="w-4 h-4" />
                                )}
                              </button>
                            </div>
                          </div>

                          {/* Expanded view */}
                          {expandedBlocks.has(block.id) && (
                            <div className="mt-3 pt-3 border-t border-white border-opacity-30">
                              <div className="space-y-2 text-sm">
                                {block.config.subject_prompt && (
                                  <div>
                                    <div className="font-medium opacity-75">Subject Prompt:</div>
                                    <div className="bg-white bg-opacity-50 p-2 rounded text-xs font-mono">
                                      {block.config.subject_prompt}
                                    </div>
                                  </div>
                                )}
                                {block.config.body_prompt && (
                                  <div>
                                    <div className="font-medium opacity-75">Body Prompt:</div>
                                    <div className="bg-white bg-opacity-50 p-2 rounded text-xs font-mono">
                                      {block.config.body_prompt}
                                    </div>
                                  </div>
                                )}
                                {/* Debug info */}
                                {block.block_type === 'email' && !block.config.subject_prompt && !block.config.body_prompt && (
                                  <div className="text-red-500 text-xs">
                                    ⚠️ No email content configured
                                  </div>
                                )}
                                {block.config.connection_message_prompt && (
                                  <div>
                                    <div className="font-medium opacity-75">Connection Message:</div>
                                    <div className="bg-white bg-opacity-50 p-2 rounded text-xs font-mono">
                                      {block.config.connection_message_prompt}
                                    </div>
                                  </div>
                                )}
                                {block.config.task_description && (
                                  <div>
                                    <div className="font-medium opacity-75">Task Description:</div>
                                    <div className="bg-white bg-opacity-50 p-2 rounded text-xs">
                                      {block.config.task_description}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating drag overlay - follows mouse cursor */}
      {dragState.isDragging && dragState.draggedBlockId && (
        <div
          className="fixed pointer-events-none z-50 transform -translate-x-1/2 -translate-y-1/2 transition-none"
          style={{
            left: dragState.currentPos.x,
            top: dragState.currentPos.y,
          }}
        >
          {(() => {
            const draggedBlock = formData.blocks.find(b => b.id === dragState.draggedBlockId)
            if (!draggedBlock) return null
            
            return (
              <div className={`border rounded-lg p-4 ${getBlockColor(draggedBlock.block_type)} transform rotate-2 scale-95 shadow-2xl opacity-90 w-64`}>
                <div className="flex items-center gap-3">
                  <GripVertical className="w-4 h-4 text-gray-400" />
                  <div className="flex items-center justify-center w-8 h-8 bg-white rounded-lg">
                    {getBlockIcon(draggedBlock.block_type)}
                  </div>
                  <div>
                    <div className="font-medium">{draggedBlock.name}</div>
                    <div className="text-sm opacity-75">Step {draggedBlock.step_number}</div>
                  </div>
                </div>
              </div>
            )
          })()}
        </div>
      )}
    </>
  )
}