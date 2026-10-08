import { randomUUID } from 'crypto'
import type { Table } from '@models/table.model.js'
import { normalizeTableStatus } from '@models/table.model.js'
import type { TableRepository } from '@repositories/table.repository.js'
import {
    DuplicatedTableNumberError,
    InvalidTableCapacityError,
    InvalidTableNumberError,
    RestaurantIdRequiredError,
    TableNotAvailableError,
    TableNotFoundError
} from '@errors/DomainErrors.js'

export interface CreateTableDTO {
    number: number
    description?: string
    capacity: number
    status?: string
    restaurantId: string
}

export interface UpdateTableDTO {
    number: number
    description?: string
    capacity: number
    status: string
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

    async update(id: string, dto: UpdateTableDTO): Promise<Table> {
        const existing = await this.tableRepository.findById(id)
        if (!existing) {
            throw new TableNotFoundError()
        }

        const updated = this.buildTable({
            id: existing.id,
            number: dto.number,
            description: dto.description,
            capacity: dto.capacity,
            status: dto.status,
            restaurantId: existing.restaurantId,
            createdAt: existing.createdAt,
            updatedAt: new Date().toISOString()
        })

        await this.assertNumberIsAvailable(updated)
        await this.tableRepository.save(updated)
        return updated
    }

    async delete(id: string): Promise<void> {
        const existing = await this.tableRepository.findById(id)
        if (!existing) {
            throw new TableNotFoundError()
        }
        await this.tableRepository.delete(id)
    }

    async changeStatus(id: string, status: string): Promise<Table> {
        const existing = await this.tableRepository.findById(id)
        if (!existing) {
            throw new TableNotFoundError()
        }

        const updated: Table = {
            ...existing,
            status: normalizeTableStatus(status),
            updatedAt: new Date().toISOString()
        }

        await this.tableRepository.save(updated)
        return updated
    }

    async occupy(id: string): Promise<Table> {
        const existing = await this.tableRepository.findById(id)
        if (!existing) {
            throw new TableNotFoundError()
        }
        if (existing.status !== 'libre') {
            throw new TableNotAvailableError()
        }

        const updatedAt = new Date().toISOString()
        const occupied = await this.tableRepository.occupyIfFree(id, updatedAt)
        if (!occupied) {
            throw new TableNotAvailableError()
        }

        return { ...existing, status: 'ocupada', updatedAt }
    }

    async findById(id: string): Promise<Table | null> {
        return this.tableRepository.findById(id)
    }

    async findByRestaurantId(restaurantId: string): Promise<Table[]> {
        return this.tableRepository.findByRestaurantId(restaurantId)
    }

    async findAvailable(restaurantId: string, capacity?: number): Promise<Table[]> {
        if (capacity !== undefined && (!Number.isInteger(capacity) || capacity <= 0)) {
            throw new InvalidTableCapacityError()
        }
        return this.tableRepository.findAvailable(restaurantId, capacity ?? 1)
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
