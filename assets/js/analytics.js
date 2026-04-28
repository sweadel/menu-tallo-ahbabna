export function initChart() {
    const ctx = document.getElementById('signupsChart');
    if (!ctx) return;

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
            datasets: [{
                label: 'Sign-ups',
                data: [12, 19, 3, 5, 2, 3],
                borderColor: 'rgb(75, 192, 192)',
                tension: 0.1,
                fill: true,
                backgroundColor: 'rgba(75, 192, 192, 0.2)'
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        display: false
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });

    // Update other stats
    if (document.getElementById('activeSessions')) document.getElementById('activeSessions').textContent = '42';
    if (document.getElementById('newSignups')) document.getElementById('newSignups').textContent = '5';
    if (document.getElementById('systemErrors')) document.getElementById('systemErrors').textContent = '0';
}
