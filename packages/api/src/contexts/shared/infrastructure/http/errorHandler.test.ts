import { describe, it, expect, vi } from 'vitest'
import type { Request, Response, NextFunction } from 'express'
import { errorHandler } from './errorHandler.js'
import { TableNotFoundError, TableNotAvailableError } from '@errors/DomainErrors.js'

function run(err: unknown) {
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() }
    errorHandler(err, {} as Request, res as unknown as Response, vi.fn() as NextFunction)
    return res
}

describe('errorHandler (tables)', () => {
    it('should map TableNotFoundError to 404', () => {
        const res = run(new TableNotFoundError())

        expect(res.status).toHaveBeenCalledWith(404)
        expect(res.json).toHaveBeenCalledWith({ error: 'TableNotFoundError', message: 'Table not found' })
    })

    it('should map TableNotAvailableError to 400', () => {
        const res = run(new TableNotAvailableError())

        expect(res.status).toHaveBeenCalledWith(400)
    })
})
