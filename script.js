// IIFE để bảo vệ không gian tên toàn cục
(function() {
    // --- KHAI BÁO BIẾN TOÀN CỤC VÀ HẰNG SỐ ---
    const VAT_RATE = 1.08; // Thuế VAT 8%

    const GIA_DIEN_SINH_HOAT = {
        bac_1: { min: 0, max: 50, gia: 1984 },
        bac_2: { min: 51, max: 100, gia: 2050 },
        bac_3: { min: 101, max: 200, gia: 2380 },
        bac_4: { min: 201, max: 300, gia: 2998 },
        bac_5: { min: 301, max: 400, gia: 3350 },
        bac_6: { min: 401, max: Infinity, gia: 3460 }
    };

    const GIA_DIEN_KINH_DOANH_AVG = 3878;
    const GIA_DIEN_SAN_XUAT_AVG = 2457;
    const GIA_DIEN_HANH_CHINH_AVG = 2238;

    const SO_GIO_NANG = {
        "Miền Trung/Nam": 4.0,
        "Miền Bắc": 2.9
    };
    const DIEN_TICH_TREN_KWP = 5.45;
    const SO_NGAY_TRONG_THANG = 30;
    const PERFORMANCE_RATIO = 0.90;
    const CO2_REDUCTION_FACTOR = 0.709;
    const TREE_EQUIVALENT_FACTOR = 0.012;

    let currentResultData = {};
    let billChartInstance = null;
    let paybackChartInstance = null;
    let currentLanguage = localStorage.getItem('solarAnalyticsLang') || 'vi';

    // --- CÁC HÀM CHUNG ---

    function translatePage() {
        if (typeof translations === 'undefined' || !translations[currentLanguage]) return;
        const trans = translations[currentLanguage];
        document.querySelectorAll('[data-translate-key]').forEach(el => {
            const key = el.getAttribute('data-translate-key');
            if (trans[key]) el.textContent = trans[key];
        });
        document.querySelectorAll('[data-translate-placeholder-key]').forEach(el => {
            const key = el.getAttribute('data-translate-placeholder-key');
            if (trans[key]) el.placeholder = trans[key];
        });
        document.documentElement.lang = currentLanguage;
    }

    function setLanguage(lang) {
        currentLanguage = lang;
        localStorage.setItem('solarAnalyticsLang', lang);
        location.reload();
    }

    function setActiveNav() {
        const currentPage = window.location.pathname.split('/').pop();
        const activePage = currentPage === '' ? 'index.html' : currentPage;
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === activePage) {
                link.classList.add('active');
            }
        });
    }

    function getHistory() {
        return JSON.parse(localStorage.getItem('solarHistory')) || [];
    }

    function formatNumberInput(value) {
        if (!value) return '';
        const numberString = value.toString().replace(/\D/g, '');
        return numberString.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    }
    
    function unformatNumber(value) {
        return parseFloat(String(value).replace(/\./g, '')) || 0;
    }


    // --- LOGIC TRANG PHÂN TÍCH ---
    function initAnalysisPage() {
        const calculateBtn = document.getElementById('calculate-btn');
        ['monthly-kwh', 'investment-cost', 'storage-investment-cost', 'monthly-bill'].forEach(id => {
            const inputEl = document.getElementById(id);
            if(inputEl) {
                inputEl.addEventListener('input', (e) => {
                    e.target.value = formatNumberInput(e.target.value);
                    if (id === 'monthly-bill') clearDetailInputs();
                });
                inputEl.value = formatNumberInput(inputEl.value);
            }
        });
        
        const tabKwh = document.getElementById('tab-kwh'), tabVnd = document.getElementById('tab-vnd');
        const panelKwh = document.getElementById('panel-kwh'), panelVnd = document.getElementById('panel-vnd');
        
        tabKwh?.addEventListener('click', () => {
            tabKwh.classList.add('active'); tabVnd.classList.remove('active');
            panelKwh.classList.add('active'); panelVnd.classList.remove('active');
        });
        
        tabVnd?.addEventListener('click', () => {
            tabVnd.classList.add('active'); tabKwh.classList.remove('active');
            panelVnd.classList.add('active'); panelKwh.classList.remove('active');
        });

        createMonthlyBillInputs();
        document.getElementById('day-usage-ratio')?.addEventListener('input', (e) => {
            document.getElementById('day-usage-value').textContent = `${e.target.value}%`;
        });
        document.getElementById('system-type')?.addEventListener('change', toggleHybridCost);
        toggleHybridCost();
        calculateBtn?.addEventListener('click', calculateAndShowResults);
        
        const viewHistoryId = sessionStorage.getItem('viewHistoryId');
        if (viewHistoryId) {
            const history = getHistory();
            const itemToView = history.find(item => item.id == viewHistoryId);
            if (itemToView) {
                setTimeout(() => {
                    updateResultPage(itemToView);
                    document.getElementById('result-container').classList.remove('hidden');
                    document.getElementById('analysis-form-container').classList.add('hidden');
                }, 100);
            }
            sessionStorage.removeItem('viewHistoryId');
        }
    }
    
    function createMonthlyBillInputs() {
        const grid = document.getElementById('monthly-bills-grid');
        if (!grid || !translations[currentLanguage]) return;
        const trans = translations[currentLanguage];
        for (let i = 1; i <= 12; i++) {
            const monthDiv = document.createElement('div');
            const label = document.createElement('label');
            label.htmlFor = `month-${i}`;
            label.className = "text-sm font-medium text-gray-500";
            label.textContent = trans[`month${i}`] || `Tháng ${i}`;
            const input = document.createElement('input');
            input.type = 'text'; input.id = `month-${i}`; input.inputMode = 'numeric';
            input.className = 'w-full p-1 border-b monthly-bill-detail focus:border-blue-500 outline-none text-center';
            input.addEventListener('input', () => {
                input.value = formatNumberInput(input.value);
                updateAverageBillFromDetails();
            });
            monthDiv.appendChild(label);
            monthDiv.appendChild(input);
            grid.appendChild(monthDiv);
        }
    }
    
    function updateAverageBillFromDetails() {
        const detailInputs = document.querySelectorAll('.monthly-bill-detail');
        let total = 0, count = 0;
        detailInputs.forEach(input => {
            const value = unformatNumber(input.value);
            if (value > 0) { total += value; count++; }
        });
        const average = count > 0 ? Math.round(total / count) : 0;
        document.getElementById('total-12-months').textContent = `${formatNumberInput(total)} VNĐ`;
        document.getElementById('monthly-bill').value = formatNumberInput(average);
    }
    
    function clearDetailInputs() {
        document.querySelectorAll('.monthly-bill-detail').forEach(input => input.value = '');
        document.getElementById('total-12-months').textContent = '0 VNĐ';
    }
    
    function toggleHybridCost() {
        const systemTypeEl = document.getElementById('system-type');
        const hybridCostSectionEl = document.getElementById('hybrid-cost-section');
        if (!systemTypeEl || !hybridCostSectionEl) return;
        hybridCostSectionEl.classList.toggle('active', systemTypeEl.value === 'Hybrid');
    }
    
    function tinh_kwh_tu_tien_dien_sinh_hoat(tong_tien_sau_thue) {
        const tong_tien_truoc_thue = tong_tien_sau_thue / VAT_RATE;
        let tong_kwh = 0, tien_con_lai = tong_tien_truoc_thue;
        for (const key of Object.keys(GIA_DIEN_SINH_HOAT)) {
            const bac = GIA_DIEN_SINH_HOAT[key];
            if (tien_con_lai <= 0) break;
            if (bac.max === Infinity) { tong_kwh += tien_con_lai / bac.gia; break; }
            const so_kwh_trong_bac = bac.max - (bac.min > 0 ? bac.min - 1 : 0);
            const tien_toi_da_bac = so_kwh_trong_bac * bac.gia;
            if (tien_con_lai > tien_toi_da_bac) {
                tong_kwh += so_kwh_trong_bac;
                tien_con_lai -= tien_toi_da_bac;
            } else {
                tong_kwh += tien_con_lai / bac.gia;
                tien_con_lai = 0;
            }
        }
        return Math.round(tong_kwh);
    }

    function tinh_tien_dien_sinh_hoat(so_kwh) {
        let tong_tien_truoc_thue = 0, kwh_con_lai = so_kwh;
        for (const bac of Object.values(GIA_DIEN_SINH_HOAT)) {
            if (kwh_con_lai <= 0) break;
            const so_kwh_trong_bac = bac.max - (bac.min > 0 ? bac.min - 1 : 0);
            const kwh_can_tinh = Math.min(kwh_con_lai, so_kwh_trong_bac);
            tong_tien_truoc_thue += kwh_can_tinh * bac.gia;
            kwh_con_lai -= kwh_can_tinh;
        }
        return tong_tien_truoc_thue * VAT_RATE;
    }

    function calculateAndShowResults() {
        const trans = translations[currentLanguage];
        const errorMessage = document.getElementById('calc-error-message');
        errorMessage.textContent = "";

        // --- Lấy dữ liệu từ Form ---
        const customerType = document.getElementById('survey-customer-type').value;
        const region = document.getElementById('survey-region').value;
        const system_type = document.getElementById('system-type').value;
        const day_usage_ratio_val = parseInt(document.getElementById('day-usage-ratio').value);
        const day_usage_ratio = day_usage_ratio_val / 100.0;
        
        const investment_cost_per_kwp_str = document.getElementById('investment-cost').value;
        const panel_wattage_str = document.getElementById('panel-wattage').value;
        const storage_investment_cost_per_kwh_str = document.getElementById('storage-investment-cost').value;
        
        const investment_cost_per_kwp = unformatNumber(investment_cost_per_kwp_str);
        const panel_wattage = unformatNumber(panel_wattage_str);
        const storage_investment_cost_per_kwh = unformatNumber(storage_investment_cost_per_kwh_str);

        let monthly_kwh = 0;
        let monthly_kwh_input = document.getElementById('monthly-kwh').value;
        let monthly_bill_input = document.getElementById('monthly-bill').value;
        let average_price_pre_tax = 0;

        const sun_hours = SO_GIO_NANG[region] || 4.0;
        
        switch (customerType) {
            case "Kinh doanh": average_price_pre_tax = GIA_DIEN_KINH_DOANH_AVG; break;
            case "Sản xuất": average_price_pre_tax = GIA_DIEN_SAN_XUAT_AVG; break;
            case "Hành chính sự nghiệp": average_price_pre_tax = GIA_DIEN_HANH_CHINH_AVG; break;
        }

        if (document.getElementById('tab-kwh').classList.contains('active')) {
            monthly_kwh = unformatNumber(monthly_kwh_input);
        } else {
            const monthly_bill_with_vat = unformatNumber(monthly_bill_input);
            if (isNaN(monthly_bill_with_vat) || monthly_bill_with_vat <= 0) {
                 errorMessage.textContent = trans.errorInvalidBill; return;
            }
            if (customerType === 'Hộ gia đình') {
                monthly_kwh = tinh_kwh_tu_tien_dien_sinh_hoat(monthly_bill_with_vat);
            } else {
                monthly_kwh = Math.round(monthly_bill_with_vat / (average_price_pre_tax * VAT_RATE));
            }
            monthly_kwh_input = formatNumberInput(monthly_kwh); // Cập nhật kWh đã tính
        }
        
        if (!document.getElementById('survey-name').value.trim()) {
            errorMessage.textContent = trans.errorCustomerNameRequired; return;
        }
        if (isNaN(monthly_kwh) || monthly_kwh <= 0 || isNaN(investment_cost_per_kwp) || isNaN(panel_wattage)) {
            errorMessage.textContent = trans.errorInvalidInputs; return;
        }

        let original_bill = 0;
        if (customerType === 'Hộ gia đình') {
            original_bill = tinh_tien_dien_sinh_hoat(monthly_kwh);
            if (monthly_kwh > 0) average_price_pre_tax = (original_bill / VAT_RATE) / monthly_kwh;
        } else {
            original_bill = monthly_kwh * average_price_pre_tax * VAT_RATE;
        }
        
        let required_kwp = 0;
        if (system_type === 'Hybrid') {
            required_kwp = (monthly_kwh / SO_NGAY_TRONG_THANG) / sun_hours;
        } else {
            required_kwp = (monthly_kwh / SO_NGAY_TRONG_THANG) * day_usage_ratio / sun_hours;
        }
        
        const required_area = required_kwp * DIEN_TICH_TREN_KWP;
        const recommended_kwp = Math.round(required_kwp * 100) / 100;
        
        const solar_generation_monthly = recommended_kwp * sun_hours * SO_NGAY_TRONG_THANG;
        const effective_saved_kwh = solar_generation_monthly * day_usage_ratio * PERFORMANCE_RATIO;
        
        const savings = effective_saved_kwh * average_price_pre_tax * VAT_RATE;
        const new_bill = Math.max(0, original_bill - savings);
        const annual_savings = savings * 12;

        if (system_type === 'Hybrid' && isNaN(storage_investment_cost_per_kwh)) {
            errorMessage.textContent = trans.errorInvalidStorageCost;
            return;
        }
        const storage_kwh = system_type === "Hybrid" ? recommended_kwp / 2 : 0;
        const panel_investment = recommended_kwp * investment_cost_per_kwp;
        const storage_investment = system_type === "Hybrid" ? storage_kwh * storage_investment_cost_per_kwh : 0;
        const total_investment = panel_investment + storage_investment;
        
        const payback_period_years = total_investment > 0 && annual_savings > 0 ? total_investment / annual_savings : 0;
        const roi_first_year = total_investment > 0 ? (annual_savings / total_investment) * 100 : 0;
        const number_of_panels = Math.ceil((recommended_kwp * 1000) / panel_wattage);
        const co2_reduction_yearly = (solar_generation_monthly * 12 * CO2_REDUCTION_FACTOR) / 1000;
        const tree_equivalent = solar_generation_monthly * TREE_EQUIVALENT_FACTOR * 12;

        const resultData = {
            id: Date.now(),
            date: new Date().toLocaleString('vi-VN'),
            lang: currentLanguage,
            survey: {
                name: document.getElementById('survey-name').value,
                phone: document.getElementById('survey-phone').value,
                email: document.getElementById('survey-email').value,
                address: document.getElementById('survey-address').value,
                customerType: customerType,
                region: region,
            },
            // Lưu lại các thông số đầu vào để hiển thị
            inputs: {
                monthly_kwh: monthly_kwh_input,
                investment_cost_per_kwp: investment_cost_per_kwp_str,
                panel_wattage: panel_wattage_str,
                system_type: system_type,
                storage_cost: storage_investment_cost_per_kwh_str,
                day_usage_ratio: day_usage_ratio_val,
            },
            results: {
                recommended_kwp, savings, payback_period_years, roi_first_year,
                original_bill, new_bill, total_investment, storage_kwh, required_area,
                co2_reduction_yearly, tree_equivalent, system_type, number_of_panels, annual_savings
            }
        };

        saveToHistory(resultData);
        updateResultPage(resultData);
        document.getElementById('result-container').classList.remove('hidden');
        document.getElementById('analysis-form-container').classList.add('hidden');
        window.scrollTo(0, 0);
    }
    
    function updateResultPage(data) {
        currentResultData = data;
        const { survey, inputs, results, date } = data;
        const trans = translations[currentLanguage];
        const formatCurrency = (value) => value.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' });

        // --- Cập nhật thông tin báo cáo chính ---
        document.getElementById('report-customer-name').textContent = `${trans.customerLabel}: ${survey.name}`;
        document.getElementById('report-date').textContent = `${trans.analysisDateLabel}: ${date}`;
        
        // --- Cập nhật phần "Thông Tin Khảo Sát" ---
        const surveyDetailsContainer = document.getElementById('survey-details');
        const createDetailRow = (label, value) => {
            if (!value && value !== 0) return '';
            return `<div class="info-item"><p class="font-semibold text-gray-500">${label}</p><p class="text-gray-900">${value}</p></div>`;
        };
        
        surveyDetailsContainer.innerHTML = `
            ${createDetailRow(trans.surveyNameLabel, survey.name)}
            ${createDetailRow(trans.surveyAddressLabel, survey.address)}
            ${createDetailRow(trans.surveyCustomerTypeLabel, survey.customerType)}
            ${createDetailRow(trans.surveyRegionLabel, survey.region)}
            ${createDetailRow(trans.monthlyKwhLabel, `${inputs.monthly_kwh} kWh`)}
            ${createDetailRow(trans.costPerKwpLabel, `${inputs.investment_cost_per_kwp} VNĐ`)}
            ${createDetailRow(trans.panelWattageLabel, `${inputs.panel_wattage} Wp`)}
            ${createDetailRow(trans.systemTypeLabel, inputs.system_type)}
            ${inputs.system_type === 'Hybrid' ? createDetailRow(trans.storageCostLabel, `${inputs.storage_cost} VNĐ`) : ''}
            ${createDetailRow(trans.dayUsageRatioLabel, `${inputs.day_usage_ratio}%`)}
        `;

        // --- Cập nhật các phần còn lại của báo cáo ---
        document.getElementById('system-details').innerHTML = `
            ${createIconDetailRow('M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z', trans.systemCapacityLabel, `${results.recommended_kwp.toFixed(2)} kWp`)}
            ${createIconDetailRow('M3 21v-4.5m0 0A1.5 1.5 0 014.5 15h15a1.5 1.5 0 011.5 1.5m-16.5 0h16.5m-16.5 0v4.5A1.5 1.5 0 004.5 21h15a1.5 1.5 0 001.5-1.5V16.5m-16.5 0h16.5m-16.5 0h16.5', trans.panelCountLabel, `${results.number_of_panels} ${trans.unitPanel}`)}
            ${createIconDetailRow('M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5', trans.roofAreaLabel, `${results.required_area.toFixed(2)} m²`)}
            ${results.system_type === 'Hybrid' ? createIconDetailRow('M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z', trans.storageLabel, `${results.storage_kwh.toFixed(2)} kWh`) : ''}
        `;
        document.getElementById('financial-details').innerHTML = `
            ${createIconDetailRow('M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v.01', trans.totalInvestmentLabel, formatCurrency(results.total_investment))}
            ${createIconDetailRow('M13 7h8m0 0v8m0-8l-8 8-4-4-6 6', trans.monthlySavingsLabel, formatCurrency(results.savings), 'text-green-600')}
            ${createIconDetailRow('M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', trans.paybackPeriodLabel, `${results.payback_period_years.toFixed(1)} ${trans.unitYear}`)}
            ${createIconDetailRow('M13 17h8m0 0V9m0 8l-8-8-4 4-6-6', trans.roiLabel, `${results.roi_first_year.toFixed(1)}%`)}
        `;
        document.getElementById('env-details').innerHTML = `
            ${createIconDetailRow('M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v.01', trans.co2ReductionLabel, `${results.co2_reduction_yearly.toFixed(2)} ${trans.unitTonnesPerYear}`)}
            ${createIconDetailRow('M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2h10a2 2 0 002-2v-1a2 2 0 012-2h1.945M7.881 15h8.238a2 2 0 001.945-1.534L21.382 7.5l-1.414-1.414L16 10.828 12.121 7l-1.414 1.414L12 13.586l-3.293-3.293L7.293 11.707 9 13.414l-1.119 1.586z', trans.treeEquivalentLabel, `${Math.round(results.tree_equivalent)} ${trans.unitTree}`)}
        `;
        createBillChart(results.original_bill, results.new_bill);
        createPaybackChart(results.total_investment, results.annual_savings);
        document.getElementById('export-pdf-btn')?.addEventListener('click', exportPDF);
    }
    
    function createIconDetailRow(svgPath, label, value, valueColor = 'text-gray-900') {
        return `<div class="flex items-start gap-4"><div class="bg-gray-100 p-2 rounded-lg"><svg class="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${svgPath}"></path></svg></div><div class="flex-1"><p class="text-sm text-gray-500">${label}</p><p class="font-bold text-lg ${valueColor}">${value}</p></div></div>`;
    }
    
    function saveToHistory(data) {
        const history = getHistory();
        history.unshift(data);
        if (history.length > 20) history.pop();
        localStorage.setItem('solarHistory', JSON.stringify(history));
    }
    
    function exportPDF() {
        const { jsPDF } = window.jspdf;
        const report = document.getElementById('report-content');
        const customerName = currentResultData.survey.name.replace(/\s/g, '_');
        html2canvas(report, { scale: 2 }).then(canvas => {
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`Bao_cao_Dien_mat_troi_${customerName}.pdf`);
        });
    }

    function createBillChart(original_bill, new_bill) {
        const ctx = document.getElementById('billChart')?.getContext('2d');
        if (!ctx) return;
        const trans = translations[currentLanguage];
        if (billChartInstance) billChartInstance.destroy();
        billChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: [trans.billChartBeforeLabel, trans.billChartAfterLabel],
                datasets: [{
                    label: trans.billChartDatasetLabel,
                    data: [original_bill, new_bill],
                    backgroundColor: ['rgba(239, 68, 68, 0.6)', 'rgba(34, 197, 94, 0.6)'],
                    borderColor: ['rgba(239, 68, 68, 1)', 'rgba(34, 197, 94, 1)'],
                    borderWidth: 1
                }]
            },
            options: { 
                responsive: true, 
                maintainAspectRatio: false, 
                plugins: { 
                    legend: { display: false } 
                }, 
                scales: { 
                    y: { 
                        beginAtZero: true, 
                        ticks: { 
                            callback: value => value.toLocaleString('vi-VN') + 'đ' 
                        } 
                    } 
                } 
            }
        });
    }

    function createPaybackChart(total_investment, annual_savings) {
        const ctx = document.getElementById('paybackChart')?.getContext('2d');
        if (!ctx) return;
        const trans = translations[currentLanguage];
        if (paybackChartInstance) paybackChartInstance.destroy();
        if (total_investment <= 0 || annual_savings <= 0) {
            ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
            return;
        }
        const yearsData = Array.from({length: 16}, (_, i) => `${trans.paybackChartYearLabel} ${i}`);
        const cumulativeSavings = yearsData.map((y, i) => (annual_savings * i) - total_investment);
        paybackChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: yearsData,
                datasets: [{
                    label: trans.paybackChartDatasetLabel,
                    data: cumulativeSavings,
                    borderColor: 'rgb(59, 130, 246)',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    fill: true,
                    tension: 0.1
                }]
            },
            options: {
                responsive: true, 
                maintainAspectRatio: false,
                plugins: { 
                    legend: { display: false },
                    annotation: {
                        annotations: {
                            zeroLine: {
                                type: 'line', yMin: 0, yMax: 0,
                                borderColor: 'rgb(239, 68, 68)',
                                borderWidth: 2, borderDash: [5, 5],
                                label: {
                                    content: trans.paybackChartBreakevenLabel,
                                    position: 'start', enabled: true,
                                    backgroundColor: 'rgba(239, 68, 68, 0.8)'
                                }
                            }
                        }
                    }
                },
                scales: { 
                    y: { 
                        ticks: { 
                            callback: value => (value/1000000).toFixed(0) + 'tr' 
                        } 
                    } 
                }
            }
        });
    }

    function initHistoryPage() {
        displayHistoryList();
        document.getElementById('import-btn')?.addEventListener('click', () => document.getElementById('import-file-input').click());
        document.getElementById('export-btn')?.addEventListener('click', exportHistory);
        document.getElementById('import-file-input')?.addEventListener('change', importHistory);
    }

    function displayHistoryList() {
        const history = getHistory();
        const container = document.getElementById('history-list');
        if (!container || !translations[currentLanguage]) return;
        const trans = translations[currentLanguage];
        container.innerHTML = ''; 
        if (history.length === 0) {
            container.innerHTML = `<p class="text-center text-gray-500 card p-8">${trans.noHistory}</p>`;
        } else {
            history.forEach(item => {
                const itemDiv = document.createElement('div');
                itemDiv.className = 'card p-4 flex justify-between items-center';
                itemDiv.innerHTML = `
                        <div>
                            <p class="font-bold text-lg">${item.survey.name}</p>
                            <p class="text-sm text-gray-500">${item.date}</p>
                        </div>
                        <div class="flex gap-2">
                            <button class="view-btn bg-blue-100 text-blue-700 font-medium py-2 px-4 rounded-lg hover:bg-blue-200" data-id="${item.id}">${trans.viewButton}</button>
                            <button class="delete-btn bg-red-100 text-red-700 font-medium py-2 px-4 rounded-lg hover:bg-red-200" data-id="${item.id}">${trans.deleteButton}</button>
                        </div>
                `;
                container.appendChild(itemDiv);
            });
            container.querySelectorAll('.view-btn').forEach(btn => btn.addEventListener('click', (e) => {
                sessionStorage.setItem('viewHistoryId', e.target.dataset.id);
                window.location.href = 'phan_tich.html';
            }));
            container.querySelectorAll('.delete-btn').forEach(btn => btn.addEventListener('click', (e) => {
                deleteHistoryItem(e.target.dataset.id);
            }));
        }
    }

    function deleteHistoryItem(id) {
        let history = getHistory();
        history = history.filter(h => h.id != id);
        localStorage.setItem('solarHistory', JSON.stringify(history));
        displayHistoryList();
    }

    function exportHistory() {
        const history = getHistory();
        const trans = translations[currentLanguage];
        if (history.length === 0) {
            alert(trans.noHistoryToExport);
            return;
        }
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(history, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", "solar_analytics_history.json");
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    }

    function importHistory(event) {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        const trans = translations[currentLanguage];
        reader.onload = function(e) {
            try {
                const importedData = JSON.parse(e.target.result);
                if (Array.isArray(importedData)) {
                    if (importedData.every(item => item.survey && item.results && item.inputs)) {
                        localStorage.setItem('solarHistory', JSON.stringify(importedData));
                        displayHistoryList();
                        alert(trans.importSuccess);
                    } else {
                        alert(trans.errorImportFormat);
                    }
                } else { 
                    alert(trans.errorImportFormat); 
                }
            } catch (error) {
                alert(trans.errorImportRead);
            }
        };
        reader.readAsText(file);
        event.target.value = '';
    }

    function init() {
        document.documentElement.lang = currentLanguage;
        const activeLangSwitcher = document.getElementById(`lang-${currentLanguage}`);
        if(activeLangSwitcher) activeLangSwitcher.classList.add('active');
        translatePage();
        setActiveNav();
        document.getElementById('lang-vi')?.addEventListener('click', () => setLanguage('vi'));
        document.getElementById('lang-en')?.addEventListener('click', () => setLanguage('en'));
        if (document.getElementById('analysis-page-content')) initAnalysisPage();
        if (document.getElementById('history-page-content')) initHistoryPage();
    }

    document.addEventListener('DOMContentLoaded', init);

})();