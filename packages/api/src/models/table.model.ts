import { InvalidTableStatusError } from '@errors/DomainErrors.js'

export const VALID_STATUSES = ['libre', 'ocupada', 'reservada'] as const

export type TableStatus = typeof VALID_STATUSES[number]

export interface Table {
    id: string
    number: number
    description: string
    capacity: number
    status: TableStatus
    restaurantId: string
    createdAt: string
    updatedAt: string
}

export function normalizeTableStatus(value: string): TableStatus {
    if (!value || typeof value !== 'string') {
        throw new InvalidTableStatusError('Table status must be provided')
    }

    const normalizedValue = value.trim().toLowerCase()
    if (!VALID_STATUSES.includes(normalizedValue as TableStatus)) {
        throw new InvalidTableStatusError(`Invalid table status: ${value}. Must be one of: ${VALID_STATUSES.join(', ')}`)
    }
    return normalizedValue as TableStatus
}
