// 单位换算器
function doConvert() {
    const val = parseFloat(document.getElementById('inputValue').value);
    const from = document.getElementById('fromUnit').value;
    const to = document.getElementById('toUnit').value;
    const cat = document.getElementById('category').value;
    if (!val) { alert('请输入数值'); return; }
    
    const rates = {
        length: { mm: 1, cm: 10, m: 1000, km: 1000000, inch: 25.4, ft: 304.8, yard: 914.4, mile: 1609344 },
        weight: { mg: 1, g: 1000, kg: 1000000, ton: 1000000000, oz: 28349.5, lb: 453592 },
        temp: { c: 'c', f: 'f', k: 'k' },
        area: { m2: 1, km2: 1000000, ha: 10000, mu: 666.67, acre: 4046.86, ft2: 0.092903 }
    };
    
    let result;
    if (cat === 'temp') {
        let c;
        if (from === 'c') c = val;
        else if (from === 'f') c = (val - 32) * 5/9;
        else c = val - 273.15;
        if (to === 'c') result = c;
        else if (to === 'f') result = c * 9/5 + 32;
        else result = c + 273.15;
    } else {
        const baseVal = val * rates[cat][from];
        result = baseVal / rates[cat][to];
    }
    
    document.getElementById('resultValue').textContent = result.toFixed(4);
    document.getElementById('resultLabel').textContent = `${val} ${from} = ${result.toFixed(4)} ${to}`;
    document.getElementById('resultArea').style.display = 'block';
}

function resetForm() {
    document.getElementById('inputValue').value = '';
    document.getElementById('resultArea').style.display = 'none';
}

function updateUnits() {
    const cat = document.getElementById('category').value;
    const units = {
        length: ['mm','cm','m','km','inch','ft','yard','mile'],
        weight: ['mg','g','kg','ton','oz','lb'],
        temp: ['c','f','k'],
        area: ['m2','km2','ha','mu','acre','ft2']
    };
    const sel = units[cat] || [];
    const fromSel = document.getElementById('fromUnit');
    const toSel = document.getElementById('toUnit');
    const labels = { mm:'毫米',cm:'厘米',m:'米',km:'公里',inch:'英寸',ft:'英尺',yard:'码',mile:'英里',
        mg:'毫克',g:'克',kg:'千克',ton:'吨',oz:'盎司',lb:'磅',
        c:'摄氏度',f:'华氏度',k:'开尔文',
        m2:'平方米',km2:'平方公里',ha:'公顷',mu:'亩',acre:'英亩',ft2:'平方英尺' };
    const labelsEn = { mm:'mm',cm:'cm',m:'m',km:'km',inch:'inch',ft:'ft',yard:'yard',mile:'mile',
        mg:'mg',g:'g',kg:'kg',ton:'ton',oz:'oz',lb:'lb',
        c:'°C',f:'°F',k:'K',
        m2:'m²',km2:'km²',ha:'ha',mu:'mu',acre:'acre',ft2:'ft²' };
    
    fromSel.innerHTML = sel.map(u => `<option value="${u}">${labels[u]||u}</option>`).join('');
    toSel.innerHTML = sel.map(u => `<option value="${u}">${labels[u]||u}</option>`).join('');
    toSel.value = sel[1] || sel[0];
    doConvert();
}
