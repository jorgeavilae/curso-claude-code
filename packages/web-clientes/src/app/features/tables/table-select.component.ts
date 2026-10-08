import { Component, inject, OnInit, signal } from '@angular/core'
import { ActivatedRoute, Router, RouterLink } from '@angular/router'
import { FormsModule } from '@angular/forms'
import { TableService } from '../../core/services/table.service'
import { CartStore } from '../../core/store/cart.store'
import { Table } from '../../core/models/table.model'

@Component({
  selector: 'app-table-select',
  standalone: true,
  imports: [RouterLink, FormsModule],
  template: `
    <div class="container">
      <div class="page-header">
        <h1>Elige tu mesa</h1>
        <p>Indica cuántas personas sois y selecciona una mesa libre</p>
      </div>

      <div class="card people-box">
        <label for="people">Número de personas</label>
        <input id="people" type="number" min="1" step="1" class="form-input"
               [ngModel]="people()" (ngModelChange)="onPeopleChange($event)" />
      </div>

      @if (error()) {
        <div class="alert-error">{{ error() }}</div>
      }

      @if (loading()) {
        <div class="spinner"></div>
      } @else if (tables().length === 0) {
        <div class="empty-state card">
          <p>No hay mesas libres para {{ people() }} persona(s)</p>
        </div>
      } @else {
        <div class="table-grid">
          @for (table of tables(); track table.id) {
            <button type="button" class="table-card card" [class.selected]="selectedId() === table.id"
                    (click)="selectedId.set(table.id)">
              <strong>Mesa {{ table.number }}</strong>
              <span class="capacity">{{ table.capacity }} plazas</span>
              @if (table.description) {
                <span class="description">{{ table.description }}</span>
              }
            </button>
          }
        </div>
      }

      <div class="actions">
        <a routerLink="/restaurants" class="btn">Volver</a>
        <button class="btn btn-primary" [disabled]="!selectedId() || submitting()" (click)="continue()">
          @if (submitting()) { Reservando mesa... } @else { Continuar }
        </button>
      </div>
    </div>
  `,
  styles: [`
    .container { max-width: 900px; margin: 0 auto; }
    .people-box { padding: 16px; margin-bottom: 16px; display: flex; flex-direction: column; gap: 8px; max-width: 240px; }
    .table-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 16px; margin: 16px 0; }
    .table-card { display: flex; flex-direction: column; gap: 4px; padding: 16px; text-align: left; cursor: pointer; }
    .table-card.selected { border-color: var(--green-medium); }
    .capacity, .description { color: var(--text-muted); font-size: 13px; }
    .actions { display: flex; gap: 12px; justify-content: flex-end; margin-top: 16px; }
  `]
})
export class TableSelectComponent implements OnInit {
  private readonly route = inject(ActivatedRoute)
  private readonly router = inject(Router)
  private readonly tableService = inject(TableService)
  private readonly cartStore = inject(CartStore)

  private restaurantId = ''

  readonly people = signal(2)
  readonly tables = signal<Table[]>([])
  readonly selectedId = signal<string | null>(null)
  readonly loading = signal(false)
  readonly submitting = signal(false)
  readonly error = signal<string | null>(null)

  ngOnInit(): void {
    this.restaurantId = this.route.snapshot.paramMap.get('id') ?? ''
    this.loadTables()
  }

  onPeopleChange(value: number | null): void {
    const people = Math.floor(Number(value))
    if (!Number.isFinite(people) || people < 1) {
      this.tables.set([])
      this.selectedId.set(null)
      return
    }
    this.people.set(people)
    this.error.set(null)
    this.loadTables()
  }

  continue(): void {
    const tableId = this.selectedId()
    if (!tableId || this.submitting()) return

    this.submitting.set(true)
    this.error.set(null)

    this.tableService.occupy(this.restaurantId, tableId).subscribe({
      next: (table) => {
        this.cartStore.setTableId(this.restaurantId, table.id)
        this.router.navigate(['/restaurants', this.restaurantId])
      },
      error: (err) => {
        this.submitting.set(false)
        this.error.set(err?.error?.error ?? 'No se pudo ocupar la mesa. Elige otra.')
        this.loadTables()
      }
    })
  }

  private loadTables(): void {
    this.loading.set(true)
    this.selectedId.set(null)
    this.tableService.getAvailable(this.restaurantId, this.people()).subscribe({
      next: (tables) => {
        this.tables.set(tables)
        this.loading.set(false)
      },
      error: () => {
        this.tables.set([])
        this.error.set('Error al cargar las mesas')
        this.loading.set(false)
      }
    })
  }
}
