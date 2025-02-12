export const FREE_CREDITS_PER_DAY = 15
export const FREE_ACCOUNTS_PER_USER = 1
export const PRO_ACCOUNTS_PER_USER = 3
export const ADDITIONAL_ACCOUNT_PRICE = 5 // $5 per additional account
export const MAX_TOTAL_ACCOUNTS = 10 // Maximum total accounts a user can have

// Token System Constants
export const MONTHLY_PRO_TOKENS = 1_000_000 // 1 million tokens per month for $10 subscription
export const TOKEN_PACK_PRICES = {
    SMALL: {
        tokens: 500_000,    // 500k tokens
        price: 5            // $5
    },
    MEDIUM: {
        tokens: 1_500_000,  // 1.5M tokens
        price: 12           // $12 (20% discount)
    },
    LARGE: {
        tokens: 5_000_000,  // 5M tokens
        price: 35           // $35 (30% discount)
    }
} as const

// Average token usage per message (input + output)
export const AVG_INPUT_TOKENS_PER_MSG = 500    // Average input tokens per message
export const AVG_OUTPUT_TOKENS_PER_MSG = 750    // Average output tokens per message
export const TOTAL_TOKENS_PER_MSG = AVG_INPUT_TOKENS_PER_MSG + AVG_OUTPUT_TOKENS_PER_MSG

// Attachment limits
export const MAX_ATTACHMENT_SIZE = 25 * 1024 * 1024 // 25MB per file
export const MAX_TOTAL_ATTACHMENTS_SIZE = 100 * 1024 * 1024 // 100MB total per message
export const ALLOWED_ATTACHMENT_TYPES = [
    'image/*',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/csv',
    'application/zip',
    'application/x-zip-compressed'
] as const

// Cost calculation (for reference)
// Input cost: 500 tokens * $0.15/1M = $0.000075 per message
// Output cost: 750 tokens * $0.60/1M = $0.00045 per message
// Total cost per message: ~$0.000525
// Monthly pro allocation (1M tokens) allows for ~800 messages per month