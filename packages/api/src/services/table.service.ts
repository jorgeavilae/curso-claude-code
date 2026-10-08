import { randomUUID } from 'crypto'
import type { Table } from '@models/table.model.js'
import { normalizeTableStatus } from '@models/table.model.js'
import type { TableRepository } from '@repositories/table.repository.js'
import {
    DuplicatedTableNumberError,
    InvalidTableCapacityError,
    InvalidTableNumberError,
    RestaurantIdRequiredError
} from '@errors/DomainErrors.js'

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
        const table = this.buildTable({
            id: randomUUID(),
            number: dto.number,
            description: dto.description,
            capacity: dto.capacity,
            status: dto.status ?? 'libre',
            restaurantId: dto.restaurantId,
            createdAt: now,
            updatedAt: now
        })

        await this.assertNumberIsAvailable(table)
        await this.tableRepository.save(table)
        return table
    }

    private async assertNumberIsAvailable(table: Table): Promise<void> {
        const sameNumber = await this.tableRepository.findByNumber(table.restaurantId, table.number)
        if (sameNumber && sameNumber.id !== table.id) {
            throw new DuplicatedTableNumberError()
        }
    }

    private buildTable(props: {
        id: string
        number: number
        description?: string
        capacity: number
        status: string
        restaurantId: string
        createdAt: string
        updatedAt: string
    }): Table {
        if (!Number.isInteger(props.number) || props.number <= 0) {
            throw new InvalidTableNumberError()
        }
        if (!Number.isInteger(props.capacity) || props.capacity <= 0) {
            throw new InvalidTableCapacityError()
        }
        if (!props.restaurantId || props.restaurantId.trim() === '') {
            throw new RestaurantIdRequiredError()
        }

        return {
            id: props.id,
            number: props.number,
            description: props.description?.trim() ?? '',
            capacity: props.capacity,
            status: normalizeTableStatus(props.status),
            restaurantId: props.restaurantId,
            createdAt: props.createdAt,
            updatedAt: props.updatedAt
        }
    }
}
