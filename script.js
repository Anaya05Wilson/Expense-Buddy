document.addEventListener('DOMContentLoaded', () => {
    const darkModeToggle = document.getElementById('darkModeToggle');
    const getStartedBtn = document.getElementById('getStarted');
    
    // Dark mode toggle
    darkModeToggle.addEventListener('click', () => {
        document.body.dataset.theme = document.body.dataset.theme === 'dark' ? 'light' : 'dark';
        darkModeToggle.innerHTML = document.body.dataset.theme === 'dark' ? 
            '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
        updateChart(); // Refresh chart colors if visible
    });

    // Group setup form
    const groupSetupForm = document.getElementById('groupSetupForm');
    const nameInputs = document.getElementById('nameInputs');
    const numPeople = document.getElementById('numPeople');

    numPeople.addEventListener('change', () => {
        nameInputs.innerHTML = '';
        for (let i = 0; i < numPeople.value; i++) {
            nameInputs.innerHTML += `
                <div class="input-group">
                    <label for="person${i}">Person ${i + 1} Name:</label>
                    <input type="text" id="person${i}" required>
                </div>
            `;
        }
    });

    // Expense tracking
    let expenses = [];
    let participants = [];
    let expenseChart = null;

    groupSetupForm.addEventListener('submit', (e) => {
        e.preventDefault();
        participants = Array.from(nameInputs.querySelectorAll('input')).map(input => input.value);
        updateParticipantSelectors();
        document.querySelector('.expenses-section').style.display = 'block';
        document.querySelector('.summary-section').style.display = 'block';
        showToast('Group setup completed!');
        initializeChart();
    });

    function updateParticipantSelectors() {
        const payer = document.getElementById('payer');
        const sharedWithCheckboxes = document.getElementById('sharedWithCheckboxes');
        
        payer.innerHTML = participants.map(name => 
            `<option value="${name}">${name}</option>`
        ).join('');

        sharedWithCheckboxes.innerHTML = participants.map(name => `
            <label>
                <input type="checkbox" value="${name}" checked>
                ${name}
            </label>
        `).join('');
    }

    // Add expense
    const expenseForm = document.getElementById('expenseForm');
    expenseForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const expense = {
            payer: document.getElementById('payer').value,
            amount: parseFloat(document.getElementById('amount').value),
            category: document.getElementById('category').value,
            sharedWith: Array.from(document.querySelectorAll('#sharedWithCheckboxes input:checked'))
                .map(checkbox => checkbox.value),
            date: new Date()
        };

        expenses.push(expense);
        updateSummary();
        updateChart();
        showToast('Expense added successfully!');
        expenseForm.reset();
    });

    function updateSummary() {
        const summaryGrid = document.getElementById('summaryGrid');
        const summary = calculateSummary();
        const debts = calculateDebts();
        
        let summaryHTML = participants.map(person => `
            <div class="summary-card">
                <h3>${person}</h3>
                <p>Paid: ${getCurrencySymbol()}${summary[person].paid.toFixed(2)}</p>
                <p>Owes: ${getCurrencySymbol()}${summary[person].owes.toFixed(2)}</p>
                <p>Net: ${getCurrencySymbol()}${(summary[person].paid - summary[person].owes).toFixed(2)}</p>
            </div>
        `).join('');

        // Add settlement information
        if (debts.length > 0) {
            summaryHTML += `
                <div class="summary-card" style="grid-column: 1 / -1;">
                    <h3>Settlement Plan</h3>
                    ${debts.map(debt => `
                        <p>${debt.from} needs to pay ${getCurrencySymbol()}${debt.amount} to ${debt.to}</p>
                    `).join('')}
                </div>
            `;
        }

        summaryGrid.innerHTML = summaryHTML;
    }

    function calculateSummary() {
        const summary = {};
        participants.forEach(person => {
            summary[person] = { paid: 0, owes: 0 };
        });

        expenses.forEach(expense => {
            const perPersonShare = expense.amount / expense.sharedWith.length;
            summary[expense.payer].paid += expense.amount;
            expense.sharedWith.forEach(person => {
                summary[person].owes += perPersonShare;
            });
        });

        return summary;
    }

    function calculateDebts() {
        const summary = calculateSummary();
        const debts = [];
        
        // Calculate net amounts for each person
        const netAmounts = {};
        participants.forEach(person => {
            netAmounts[person] = summary[person].paid - summary[person].owes;
        });

        // Match creditors with debtors
        const creditors = participants.filter(p => netAmounts[p] > 0);
        const debtors = participants.filter(p => netAmounts[p] < 0);

        creditors.forEach(creditor => {
            let amountToReceive = netAmounts[creditor];
            
            debtors.forEach(debtor => {
                if (amountToReceive > 0 && netAmounts[debtor] < 0) {
                    const amount = Math.min(amountToReceive, -netAmounts[debtor]);
                    if (amount > 0.01) { // Ignore tiny amounts due to floating point
                        debts.push({
                            from: debtor,
                            to: creditor,
                            amount: parseFloat(amount.toFixed(2))
                        });
                        amountToReceive -= amount;
                        netAmounts[debtor] += amount;
                    }
                }
            });
        });

        return debts;
    }

    function getCurrencySymbol() {
        const currency = document.getElementById('currency').value;
        const symbols = {
            'USD': '$',
            'EUR': '€',
            'GBP': '£',
            'INR': '₹'
        };
        return symbols[currency] || '$';
    }

    function showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease forwards';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    function initializeChart() {
        const ctx = document.getElementById('expenseChart').getContext('2d');
        expenseChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Food', 'Travel', 'Stay', 'Misc'],
                datasets: [{
                    data: [0, 0, 0, 0],
                    backgroundColor: [
                        '#8ecae6',
                        '#95d5b2',
                        '#219ebc',
                        '#023047'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });
    }

    function updateChart() {
        if (!expenseChart) return;

        const categoryTotals = {
            food: 0,
            travel: 0,
            stay: 0,
            misc: 0
        };

        expenses.forEach(expense => {
            categoryTotals[expense.category] += expense.amount;
        });

        expenseChart.data.datasets[0].data = Object.values(categoryTotals);
        expenseChart.update();
    }

    window.sortExpenses = function(criteria) {
        expenses.sort((a, b) => {
            switch(criteria) {
                case 'amount':
                    return b.amount - a.amount;
                case 'category':
                    return a.category.localeCompare(b.category);
                default:
                    return 0;
            }
        });
        updateSummary();
        showToast(`Sorted by ${criteria}`);
    };

    // Download PDF functionality (placeholder)
    document.getElementById('downloadPDF').addEventListener('click', () => {
        showToast('PDF download feature coming soon!', 'info');
    });
});