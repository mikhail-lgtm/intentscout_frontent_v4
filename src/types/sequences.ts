export enum SequenceStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  PAUSED = 'paused',
  ARCHIVED = 'archived'
}

export enum SequenceBlockType {
  EMAIL = 'email',
  LINKEDIN_MESSAGE = 'linkedin_message',
  LINKEDIN_CONNECTION = 'linkedin_connection',
  PHONE_CALL = 'phone_call',
  TASK = 'task',
  WAIT = 'wait'
}

export enum SequenceDelayUnit {
  MINUTES = 'minutes',
  HOURS = 'hours',
  DAYS = 'days',
  WEEKS = 'weeks'
}

export enum DataSourceType {
  SIGNAL = 'signal',
  COMPANY = 'company',
  CONTACT = 'contact',
  LINKEDIN = 'linkedin',
  COACTOR = 'coactor',
  CUSTOM = 'custom'
}

export interface DataSourceConfig {
  source_type: DataSourceType
  fields: string[] // Keep for backward compatibility but not used in UI
  required: boolean
  fallback_text?: string // Used for custom prompts for certain sources
}

export interface SequenceBlockConfig {
  // For message blocks (email, linkedin_message)
  subject_prompt?: string
  body_prompt?: string
  
  // For connection requests
  connection_message_prompt?: string
  
  // For tasks
  task_description?: string
  
  // NEW: Data source configuration
  data_sources: DataSourceConfig[]
  
  // For any block type - additional custom settings
  custom_settings?: Record<string, any>
}

export interface SequenceBlock {
  id: string
  step_number: number
  block_type: SequenceBlockType
  name: string
  delay_value: number
  delay_unit: SequenceDelayUnit
  config: SequenceBlockConfig
}

export interface Sequence {
  id?: string
  name: string
  description?: string
  status: SequenceStatus
  blocks: SequenceBlock[]
  organization_id: string
  created_by: string
  created_at?: string
  updated_at?: string
}

export interface CreateSequenceRequest {
  name: string
  description?: string
  blocks?: SequenceBlock[]
}

export interface UpdateSequenceRequest {
  name?: string
  description?: string
  status?: SequenceStatus
  blocks?: SequenceBlock[]
}

// UI-specific types
export interface SequenceTemplate {
  id: string
  name: string
  description: string
  blocks: SequenceBlock[]
  category: string
}

// Block templates for the sequence builder
export const BLOCK_TEMPLATES: Record<SequenceBlockType, Partial<SequenceBlock>> = {
  [SequenceBlockType.EMAIL]: {
    block_type: SequenceBlockType.EMAIL,
    name: 'Send Email',
    delay_value: 1,
    delay_unit: SequenceDelayUnit.DAYS,
    config: {
      subject_prompt: 'Write a compelling subject line for an outbound email to {{first_name}} at {{company_name}}',
      body_prompt: 'Write a professional outbound email to {{first_name}} at {{company_name}}. Keep it concise and focus on value.',
      data_sources: []
    }
  },
  [SequenceBlockType.LINKEDIN_MESSAGE]: {
    block_type: SequenceBlockType.LINKEDIN_MESSAGE,
    name: 'LinkedIn Message',
    delay_value: 2,
    delay_unit: SequenceDelayUnit.DAYS,
    config: {
      data_sources: []
    }
  },
  [SequenceBlockType.LINKEDIN_CONNECTION]: {
    block_type: SequenceBlockType.LINKEDIN_CONNECTION,
    name: 'LinkedIn Connection',
    delay_value: 0,
    delay_unit: SequenceDelayUnit.DAYS,
    config: {
      data_sources: []
    }
  },
  [SequenceBlockType.PHONE_CALL]: {
    block_type: SequenceBlockType.PHONE_CALL,
    name: 'Phone Call',
    delay_value: 3,
    delay_unit: SequenceDelayUnit.DAYS,
    config: {
      data_sources: []
    }
  },
  [SequenceBlockType.TASK]: {
    block_type: SequenceBlockType.TASK,
    name: 'Custom Task',
    delay_value: 1,
    delay_unit: SequenceDelayUnit.DAYS,
    config: {
      data_sources: []
    }
  },
  [SequenceBlockType.WAIT]: {
    block_type: SequenceBlockType.WAIT,
    name: 'Wait Period',
    delay_value: 7,
    delay_unit: SequenceDelayUnit.DAYS,
    config: {
      data_sources: []
    }
  }
}