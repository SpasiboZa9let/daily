const cardData = [
  { color: '#060010', title: 'Обо мне', description: 'Краткая инфа', label: 'Intro' },
  { color: '#060010', title: 'Проекты', description: 'Мои работы', label: 'Work' },
  { color: '#060010', title: 'Контакты', description: 'GitHub, Telegram', label: 'Links' },
  { color: '#060010', title: 'Заметки', description: 'Ежедневные мысли', label: 'Daily' },
]

const app = document.getElementById('app')

app.innerHTML = `
  <div class="card-grid bento-section">
    ${cardData.map(card => `
      <div class="card" style="background:${card.color}">
        <div class="card__header">
          <div class="card__label">${card.label}</div>
        </div>
        <div class="card__content">
          <h2 class="card__title">${card.title}</h2>
          <p class="card__description">${card.description}</p>
        </div>
      </div>
    `).join('')}
  </div>
`

// простой эффект наведения
document.querySelectorAll('.card').forEach(card => {
  card.addEventListener('mouseenter', () => {
    gsap.to(card, { scale: 1.05, duration: 0.3 })
  })
  card.addEventListener('mouseleave', () => {
    gsap.to(card, { scale: 1, duration: 0.3 })
  })
})
