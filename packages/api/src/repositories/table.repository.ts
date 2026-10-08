import type { Table } from '@models/table.model.js'

export interface TableRepository {
    findById(id: string): Promise<Table | null>
    save(table: Table): Promise<void>
}
