const fs = require('fs');

const csvPath = 'c:\\KPI\\kpi area base-claude - data.csv';
const content = fs.readFileSync(csvPath, 'utf8');

const lines = content.split('\n').map(l => l.trim()).filter(l => l.length > 0);

let currentCategory = '';
let kpis = [];
let monthlyData = [];

// Columns: 
// 0: ตัวชี้วัด, 1: เป้าหมาย, 2: หน่วย, 3-14: เดือน (ต.ค. 68 - ก.ย. 69), 15: หมายเหตุ

const months = ['10-2568', '11-2568', '12-2568', '01-2569', '02-2569', '03-2569', '04-2569', '05-2569', '06-2569', '07-2569', '08-2569', '09-2569'];

let kpiIdCounter = 1;

for(let i=0; i<lines.length; i++) {
    const line = lines[i];
    // skip first few lines
    if(line.includes('23.12') || line.includes('ตัวชี้วัด') || line.includes('68","') || line.includes(',,,,,,,,,,,,,,,,,,,,')) {
        if(line.includes('ประเด็นที่')) {
            currentCategory = line.split(',')[0].replace(/\"/g, '');
        }
        continue;
    }
    
    // Parse CSV line (handling quoted commas)
    let cols = [];
    let inQuotes = false;
    let curr = '';
    for(let j=0; j<line.length; j++) {
        if(line[j] === '"') inQuotes = !inQuotes;
        else if(line[j] === ',' && !inQuotes) {
            cols.push(curr);
            curr = '';
        } else {
            curr += line[j];
        }
    }
    cols.push(curr);

    if(cols.length < 3) continue;

    if(cols[0].startsWith('ประเด็นที่')) {
        currentCategory = cols[0];
        continue;
    }

    const kpiFull = cols[0];
    const match = kpiFull.match(/^(\d+(?:\.\d+)*\.)\s*(.*)$/);
    let kpi_number = '';
    let kpi_name = kpiFull;
    if(match) {
        kpi_number = match[1];
        kpi_name = match[2];
    } else {
        const spaceIdx = kpiFull.indexOf(' ');
        if(spaceIdx > 0 && !isNaN(parseInt(kpiFull[0]))) {
            kpi_number = kpiFull.substring(0, spaceIdx);
            kpi_name = kpiFull.substring(spaceIdx+1);
        }
    }

    const target = cols[1];
    const unit = cols[2];

    kpis.push(`INSERT INTO public.kpis (id, kpi_number, kpi_name, target, unit, category) VALUES (${kpiIdCounter}, '${kpi_number.replace(/'/g, "''")}', '${kpi_name.replace(/'/g, "''")}', '${target.replace(/'/g, "''")}', '${unit.replace(/'/g, "''")}', '${currentCategory.replace(/'/g, "''")}');`);

    // monthly data
    for(let m=0; m<12; m++) {
        let val = cols[3+m];
        if(val && val.trim() !== '') {
            let numVal = parseFloat(val.replace(/[^0-9.-]/g, ''));
            if(!isNaN(numVal)) {
                monthlyData.push(`INSERT INTO public.kpi_monthly_data (kpi_id, month_year, value) VALUES (${kpiIdCounter}, '${months[m]}', ${numVal});`);
            }
        }
    }

    kpiIdCounter++;
}

fs.writeFileSync('c:\\KPI\\kpi-dashboard\\seed.sql', kpis.join('\n') + '\n\n' + monthlyData.join('\n'));
console.log('generated seed.sql');
