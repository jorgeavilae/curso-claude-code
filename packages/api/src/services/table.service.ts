import { randomUUID } from 'crypto'
import type { Table } from '@models/table.model.js'
import { normalizeTableStatus } from '@models/table.model.js'
import type { TableRepository } from '@repositories/table.repository.js'

export interface CreateTableDTO {
    number: number
    description?: string
    capacity: number
    status?: string
    restaurantId: string
}

export class TableService {
    constructor(private readonly tableRepository: TableRepository) {}

    async create(dto: CreateTableDTO): Promise<Table> {
        const now = new Date().toISOString()
        const table: Table = {
            id: randomUUID(),
            number: dto.number,
            description: dto.description ?? '',
            capacity: dto.capacity,
            status: normalizeTableStatus(dto.status ?? 'libre'),
            restaurantId: dto.restaurantId,
            createdAt: now,
            updatedAt: now
        }

        await this.tableRepository.save(table)
        return table
    }
}
