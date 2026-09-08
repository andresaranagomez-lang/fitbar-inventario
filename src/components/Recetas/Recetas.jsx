import { useMemo, useState } from 'react'

function Recetas({
  productos = [],
  recetas = [],
  onGuardarReceta,
  onEliminarReceta,
}) {
  const [recetaActual, setRecetaActual] = useState({
    productoId: '',
    ingredientes: [],
  })

  const productosFitbar = useMemo(
    () =>
      productos.filter(
        (producto) =>
          producto.tipo === 'Producto Fitbar' &&
          producto.activo !== false
      ),
    [productos]
  )

  const materiasPrimas = useMemo(
    () =>
      productos.filter(
        (producto) =>
          producto.tipo === 'Materia prima' &&
          producto.activo !== false
      ),
    [productos]
  )

  const recetaSeleccionada = useMemo(
    () =>
      recetas.find(
        (receta) =>
          receta.productoId === Number(recetaActual.productoId)
      ),
    [recetas, recetaActual.productoId]
  )

  const costoReceta = useMemo(
    () =>
      recetaActual.ingredientes.reduce((total, ingrediente) => {
        const producto = materiasPrimas.find(
          (item) => item.id === Number(ingrediente.productoId)
        )

        if (!producto) return total

        const cantidad = Number(ingrediente.cantidad) || 0
        const costo = Number(producto.costo) || 0

        return total + cantidad * costo
      }, 0),
    [recetaActual.ingredientes, materiasPrimas]
  )

  const ingredientesConCosto = useMemo(
    () =>
      recetaActual.ingredientes.map((ingrediente) => {
        const producto = materiasPrimas.find(
          (item) => item.id === Number(ingrediente.productoId)
        )

        const cantidad = Number(ingrediente.cantidad) || 0
        const costo = Number(producto?.costo) || 0

        return {
          ...ingrediente,
          producto,
          costoTotal: cantidad * costo,
        }
      }),
    [recetaActual.ingredientes, materiasPrimas]
  )

  const seleccionarProductoReceta = (productoId) => {
    const recetaExistente = recetas.find(
      (receta) => receta.productoId === Number(productoId)
    )

    setRecetaActual({
      productoId,
      ingredientes: recetaExistente
        ? recetaExistente.ingredientes.map((ingrediente) => ({
            productoId: Number(ingrediente.productoId),
            cantidad: ingrediente.cantidad,
          }))
        : [],
    })
  }

  const agregarIngrediente = () => {
    if (!recetaActual.productoId) {
      alert('Primero selecciona el producto Fitbar.')
      return
    }

    const disponible = materiasPrimas.find(
      (producto) =>
        !recetaActual.ingredientes.some(
          (ingrediente) =>
            Number(ingrediente.productoId) === producto.id
        )
    )

    if (!disponible) {
      alert('Todas las materias primas disponibles ya fueron agregadas.')
      return
    }

    // Importante: el ingrediente comienza vacío para que el usuario
    // seleccione explícitamente la materia prima.
    setRecetaActual((actual) => ({
      ...actual,
      ingredientes: [
        ...actual.ingredientes,
        {
          productoId: '',
          cantidad: '',
        },
      ],
    }))
  }

  const cambiarIngrediente = (indice, campo, valor) => {
    setRecetaActual((actual) => ({
      ...actual,
      ingredientes: actual.ingredientes.map((ingrediente, i) =>
        i === indice
          ? {
              ...ingrediente,
              [campo]:
                campo === 'productoId'
                  ? valor === ''
                    ? ''
                    : Number(valor)
                  : valor,
            }
          : ingrediente
      ),
    }))
  }

  const eliminarIngrediente = (indice) => {
    setRecetaActual((actual) => ({
      ...actual,
      ingredientes: actual.ingredientes.filter(
        (_, i) => i !== indice
      ),
    }))
  }

  const limpiarReceta = () => {
    setRecetaActual({
      productoId: '',
      ingredientes: [],
    })
  }

  const guardarReceta = async (event) => {
    event.preventDefault()

    if (!recetaActual.productoId) {
      alert('Selecciona el producto Fitbar.')
      return
    }

    if (recetaActual.ingredientes.length === 0) {
      alert('Agrega al menos un ingrediente.')
      return
    }

    const ingredientesInvalidos =
      recetaActual.ingredientes.some(
        (ingrediente) =>
          !ingrediente.productoId ||
          Number(ingrediente.cantidad) <= 0
      )

    if (ingredientesInvalidos) {
      alert(
        'Verifica que todos los ingredientes tengan una cantidad mayor que cero.'
      )
      return
    }

    const productosRepetidos =
      new Set(
        recetaActual.ingredientes.map(
          (ingrediente) => Number(ingrediente.productoId)
        )
      ).size !== recetaActual.ingredientes.length

    if (productosRepetidos) {
      alert('No puedes repetir la misma materia prima en una receta.')
      return
    }

    const nuevaReceta = {
      id: recetaSeleccionada?.id || Date.now(),
      productoId: Number(recetaActual.productoId),
      ingredientes: recetaActual.ingredientes.map((ingrediente) => ({
        productoId: Number(ingrediente.productoId),
        cantidad: Number(ingrediente.cantidad),
      })),
    }

    const guardada = await onGuardarReceta?.(nuevaReceta)

    if (guardada === false) return

    alert(
      recetaSeleccionada
        ? 'Receta actualizada correctamente.'
        : 'Receta guardada correctamente.'
    )
  }

  const cargarReceta = (receta) => {
    setRecetaActual({
      productoId: String(receta.productoId),
      ingredientes: receta.ingredientes.map((ingrediente) => ({
        productoId: Number(ingrediente.productoId),
        cantidad: ingrediente.cantidad,
      })),
    })
  }

  const eliminarReceta = async (productoId) => {
    const producto = productosFitbar.find(
      (item) => item.id === Number(productoId)
    )

    if (
      window.confirm(
        `¿Deseas eliminar la receta de "${
          producto?.nombre || 'este producto'
        }"?`
      )
    ) {
      const eliminada = await onEliminarReceta?.(productoId)

      if (eliminada === false) return

      if (
        Number(recetaActual.productoId) === Number(productoId)
      ) {
        limpiarReceta()
      }
    }
  }

  const formatearNumero = (valor) =>
    Number(valor || 0).toLocaleString('es-CO', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })

  const formatearMoneda = (valor) =>
    Number(valor || 0).toLocaleString('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    })

  return (
    <>
      <div className="page-header recipes-page-header">
        <div>
          <span className="eyebrow">PRODUCCIÓN · FITBAR</span>
          <h1>Recetas</h1>
          <p>
            Define qué materias primas y qué cantidades necesita cada
            producto Fitbar.
          </p>
        </div>

        <div className="recipes-header-status">
          <span className="recipes-live-dot" />
          <div>
            <strong>{recetas.length} recetas configuradas</strong>
            <small>Fórmulas disponibles para las ventas</small>
          </div>
        </div>
      </div>

      <div className="summary-grid recipes-summary-grid">
        <div className="summary-card recipe-kpi">
          <div className="recipe-kpi-icon">PF</div>
          <div>
            <span>Productos Fitbar</span>
            <strong>{productosFitbar.length}</strong>
            <small>Productos que pueden tener receta</small>
          </div>
        </div>

        <div className="summary-card recipe-kpi">
          <div className="recipe-kpi-icon">MP</div>
          <div>
            <span>Materias primas</span>
            <strong>{materiasPrimas.length}</strong>
            <small>Ingredientes disponibles</small>
          </div>
        </div>

        <div className="summary-card recipe-kpi">
          <div className="recipe-kpi-icon">✓</div>
          <div>
            <span>Recetas configuradas</span>
            <strong>{recetas.length}</strong>
            <small>Fórmulas guardadas</small>
          </div>
        </div>

        <div className="summary-card recipe-kpi">
          <div className="recipe-kpi-icon">Σ</div>
          <div>
            <span>Receta seleccionada</span>
            <strong>
              {recetaActual.productoId ? 'Activa' : '—'}
            </strong>
            <small>
              {recetaActual.productoId
                ? 'Lista para revisar'
                : 'Selecciona un producto'}
            </small>
          </div>
        </div>
      </div>

      <div className="recipe-layout recipes-layout-modern">
        <section className="panel recipe-builder recipe-builder-modern">
          <div className="panel-header">
            <div>
              <span className="section-kicker">CONFIGURACIÓN</span>
              <h2>Constructor de receta</h2>
              <p>
                Una receta representa el consumo necesario para preparar una
                unidad del producto.
              </p>
            </div>

            {recetaSeleccionada && (
              <span className="recipe-edit-badge">Editando receta</span>
            )}
          </div>

          <form onSubmit={guardarReceta}>
            <div className="recipe-product-selector recipe-product-selector-modern">
              <div className="recipe-selector-label">
                <span className="recipe-field-icon">PF</span>
                <div>
                  <label htmlFor="producto-fitbar-receta">
                    Producto Fitbar
                  </label>
                  <small>
                    Selecciona el producto que vas a formular.
                  </small>
                </div>
              </div>

              <select
                id="producto-fitbar-receta"
                value={recetaActual.productoId}
                onChange={(event) =>
                  seleccionarProductoReceta(event.target.value)
                }
              >
                <option value="">Selecciona un producto...</option>

                {productosFitbar.map((producto) => (
                  <option key={producto.id} value={producto.id}>
                    {producto.codigo} · {producto.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div className="recipe-section-title recipe-section-title-modern">
              <div>
                <span className="section-kicker">INGREDIENTES</span>
                <h3>Composición del producto</h3>
                <span>
                  Agrega cada materia prima y define la cantidad por unidad.
                </span>
              </div>

              <button
                type="button"
                className="secondary-button recipe-add-button"
                onClick={agregarIngrediente}
                disabled={!recetaActual.productoId}
              >
                + Agregar ingrediente
              </button>
            </div>

            <div className="recipe-ingredients recipe-ingredients-modern">
              {recetaActual.ingredientes.length === 0 ? (
                <div className="recipe-empty recipe-empty-modern">
                  <div className="recipe-empty-icon">＋</div>
                  <strong>No hay ingredientes agregados</strong>
                  <span>
                    Selecciona un producto Fitbar y agrega las materias primas
                    que utiliza.
                  </span>
                </div>
              ) : (
                <>
                  <div className="ingredient-heading">
                    <span>#</span>
                    <span>MATERIA PRIMA</span>
                    <span>CANTIDAD</span>
                    <span>UNIDAD</span>
                    <span>COSTO</span>
                    <span></span>
                  </div>

                  {ingredientesConCosto.map((ingrediente, indice) => {
                    const opcionesDisponibles = materiasPrimas.filter(
                      (materia) =>
                        materia.id === Number(ingrediente.productoId) ||
                        !recetaActual.ingredientes.some(
                          (item, itemIndex) =>
                            itemIndex !== indice &&
                            Number(item.productoId) === materia.id
                        )
                    )

                    return (
                      <div
                        className="ingredient-row ingredient-row-modern"
                        key={`${ingrediente.productoId || 'nuevo'}-${indice}`}
                      >
                        <div className="ingredient-number">
                          {String(indice + 1).padStart(2, '0')}
                        </div>

                        <select
                          value={ingrediente.productoId}
                          onChange={(event) =>
                            cambiarIngrediente(
                              indice,
                              'productoId',
                              event.target.value
                            )
                          }
                        >
                          <option value="">
                            Seleccionar ingrediente...
                          </option>

                          {opcionesDisponibles.map((materia) => (
                            <option key={materia.id} value={materia.id}>
                              {materia.codigo} · {materia.nombre}
                            </option>
                          ))}
                        </select>

                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="Cantidad"
                          value={ingrediente.cantidad}
                          onChange={(event) =>
                            cambiarIngrediente(
                              indice,
                              'cantidad',
                              event.target.value
                            )
                          }
                        />

                        <span className="ingredient-unit ingredient-unit-modern">
                          {ingrediente.producto?.unidad || '—'}
                        </span>

                        <span className="ingredient-cost">
                          {ingrediente.producto?.costo > 0
                            ? formatearMoneda(ingrediente.costoTotal)
                            : 'Pendiente'}
                        </span>

                        <button
                          type="button"
                          className="delete-ingredient delete-ingredient-modern"
                          onClick={() => eliminarIngrediente(indice)}
                          title="Eliminar ingrediente"
                        >
                          ×
                        </button>
                      </div>
                    )
                  })}
                </>
              )}
            </div>

            <div className="recipe-summary recipe-summary-modern">
              <div>
                <span>Costo estimado por unidad</span>
                <strong>{formatearMoneda(costoReceta)}</strong>
              </div>

              <div className="recipe-summary-info">
                <span className="recipe-cost-icon">i</span>
                <span>
                  {recetaActual.ingredientes.some(
                    (ingrediente) => {
                      const materia = materiasPrimas.find(
                        (item) =>
                          item.id === Number(ingrediente.productoId)
                      )
                      return !materia || Number(materia.costo) <= 0
                    }
                  )
                    ? 'Hay materias primas sin costo registrado. El valor total se completará cuando sus costos estén definidos en Entradas.'
                    : 'El costo se calcula con el costo unitario actual de cada materia prima.'}
                </span>
              </div>
            </div>

            <div className="modal-actions recipe-actions-modern">
              <button
                type="button"
                className="secondary-button"
                onClick={limpiarReceta}
              >
                Limpiar
              </button>

              <button
                type="submit"
                className="primary-button"
                disabled={!recetaActual.productoId}
              >
                {recetaSeleccionada
                  ? 'Actualizar receta'
                  : 'Guardar receta'}
              </button>
            </div>
          </form>
        </section>

        <section className="panel configured-recipes-panel">
          <div className="panel-header">
            <div>
              <span className="section-kicker">CATÁLOGO</span>
              <h2>Recetas configuradas</h2>
              <p>
                Selecciona una receta para revisarla o actualizarla.
              </p>
            </div>

            <span className="count-badge">
              {recetas.length}
            </span>
          </div>

          <div className="configured-recipes configured-recipes-modern">
            {recetas.length === 0 ? (
              <div className="recipe-empty compact recipe-empty-modern">
                <div className="recipe-empty-icon">≡</div>
                <strong>Aún no hay recetas</strong>
                <span>
                  La primera receta que guardes aparecerá aquí.
                </span>
              </div>
            ) : (
              recetas.map((receta) => {
                const producto = productosFitbar.find(
                  (item) => item.id === receta.productoId
                )

                const activa =
                  Number(recetaActual.productoId) ===
                  Number(receta.productoId)

                return (
                  <div
                    className={`configured-recipe configured-recipe-modern ${
                      activa ? 'is-selected' : ''
                    }`}
                    key={receta.id}
                  >
                    <button
                      type="button"
                      className="configured-recipe-main"
                      onClick={() => cargarReceta(receta)}
                    >
                      <div className="configured-recipe-icon">
                        PF
                      </div>

                      <div className="configured-recipe-content">
                        <div className="configured-recipe-title">
                          <strong>
                            {producto?.nombre || 'Producto'}
                          </strong>
                          {activa && (
                            <span className="recipe-selected-label">
                              Seleccionada
                            </span>
                          )}
                        </div>

                        <span>
                          {producto?.codigo || 'PF'} ·{' '}
                          {receta.ingredientes.length}{' '}
                          {receta.ingredientes.length === 1
                            ? 'ingrediente'
                            : 'ingredientes'}
                        </span>
                      </div>
                    </button>

                    <button
                      type="button"
                      className="delete-recipe"
                      title="Eliminar receta"
                      onClick={() =>
                        eliminarReceta(receta.productoId)
                      }
                    >
                      ×
                    </button>
                  </div>
                )
              })
            )}
          </div>
        </section>
      </div>
    </>
  )
}

export default Recetas
