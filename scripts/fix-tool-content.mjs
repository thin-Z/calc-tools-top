/* fix-tool-content.mjs — 修复 23 个计算器/图片工具页的"模板串味"内容
 * 将 About 第二段（文本工具受众）与 How to Use 步骤（粘贴文本）替换为工具专属内容。
 * 用法: node scripts/fix-tool-content.mjs [--dry-run]
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const DRY = process.argv.includes('--dry-run');

/* ============ 内容映射：每个工具的中英文 About 受众段 + How to Use 步骤 ============ */
const CONTENT = {
  'calculators/bmi': {
    zh: {
      audience: '无论是关注体重健康的人群、健身爱好者、减脂增肌人士，还是需要体检指标评估的普通用户，都能快速获得身体质量指数参考。',
      steps: [
        '在"身高"输入框中填写身高（厘米）。',
        '在"体重"输入框中填写体重（千克）。',
        '点击"开始计算"按钮，立即得到 BMI 数值。',
        '根据结果了解体重分类和对应的健康建议。'
      ]
    },
    en: {
      audience: 'Whether you are managing your weight, following a fitness plan, or simply checking your health metrics, you can get an instant BMI reference.',
      steps: [
        'Enter your height in centimeters in the "Height" field.',
        'Enter your weight in kilograms in the "Weight" field.',
        'Click the "Calculate" button to get your BMI instantly.',
        'Review your weight category and the health advice provided.'
      ]
    }
  },
  'calculators/car-loan': {
    zh: {
      audience: '无论是准备购车的消费者、汽车经销商，还是需要规划分期预算的普通用户，都能快速估算月供与总利息。',
      steps: [
        '在"车辆价格"输入框中填写裸车价（元）。',
        '填写首付金额或首付比例。',
        '填写贷款期限（年）与年利率。',
        '点击"开始计算"，查看月供、总利息与还款计划。'
      ]
    },
    en: {
      audience: 'Whether you are planning to buy a car, working at a dealership, or budgeting for a vehicle purchase, you can estimate monthly payments and total interest quickly.',
      steps: [
        'Enter the vehicle price in the "Car Price" field.',
        'Enter your down payment amount or percentage.',
        'Enter the loan term (years) and annual interest rate.',
        'Click "Calculate" to see your monthly payment, total interest, and repayment plan.'
      ]
    }
  },
  'calculators/compound-interest': {
    zh: {
      audience: '无论是理财投资者、规划养老储蓄的用户，还是学习金融知识的学生，都能直观了解复利增长的力量。',
      steps: [
        '在"本金"输入框中填写初始投资金额（元）。',
        '填写年利率（%）与投资年限。',
        '选择复利频率（每年/每月/每日等）。',
        '点击"开始计算"，查看复利终值、总收益与收益率。'
      ]
    },
    en: {
      audience: 'Whether you are an investor, planning retirement savings, or a student of finance, you can see the power of compound growth at a glance.',
      steps: [
        'Enter your initial investment (principal) in the first field.',
        'Enter the annual interest rate (%) and investment period (years).',
        'Choose the compounding frequency (yearly, monthly, daily, etc.).',
        'Click "Calculate" to see the future value, total interest, and growth rate.'
      ]
    }
  },
  'calculators/date-calc': {
    zh: {
      audience: '无论是需要合同排期的职场人士、安排行程的旅行者，还是计算年龄与工作日的普通用户，都能快速得到日期推算结果。',
      steps: [
        '选择计算模式：日期推算、日期差、工作日或年龄。',
        '填写开始日期和要增加/减去的天数，或填写两个日期。',
        '点击"开始计算"按钮。',
        '查看目标日期、日期差或工作日天数结果。'
      ]
    },
    en: {
      audience: 'Whether you are scheduling contracts, planning trips, or counting ages and workdays, you can get quick date calculations.',
      steps: [
        'Choose a mode: add/subtract days, date difference, workdays, or age.',
        'Enter the start date and the days to add/subtract, or enter two dates.',
        'Click the "Calculate" button.',
        'View the target date, day difference, or workday count.'
      ]
    }
  },
  'calculators/electricity': {
    zh: {
      audience: '无论是想了解家电耗电量的普通家庭、精打细算的租房用户，还是关注能源成本的商户，都能快速估算电费支出。',
      steps: [
        '在"功率"输入框中填写电器的额定功率（瓦）。',
        '填写每日使用时长（小时）与天数。',
        '填写电价（元/度）。',
        '点击"开始计算"，查看每日/每月耗电量与电费。'
      ]
    },
    en: {
      audience: 'Whether you want to know your appliance power usage, manage household costs, or estimate energy bills, you can quickly calculate electricity expenses.',
      steps: [
        'Enter the appliance wattage in the "Power" field.',
        'Enter daily usage hours and the number of days.',
        'Enter your electricity rate (per kWh).',
        'Click "Calculate" to see daily/monthly usage and cost.'
      ]
    }
  },
  'calculators/fuel-cost': {
    zh: {
      audience: '无论是自驾出行的车主、跑长途的货运司机，还是需要核算车辆成本的运营者，都能快速计算油费与每公里成本。',
      steps: [
        '在"行驶距离"输入框中填写里程（公里）。',
        '填写百公里油耗（升）与油价（元/升，可选）。',
        '点击"计算"按钮。',
        '查看总耗油量、总油费与每公里成本。'
      ]
    },
    en: {
      audience: 'Whether you are a daily driver, a long-haul trucker, or managing fleet costs, you can quickly calculate fuel expenses and cost per kilometer.',
      steps: [
        'Enter the distance traveled in kilometers.',
        'Enter fuel consumption per 100 km (liters) and the fuel price per liter (optional).',
        'Click the "Calculate" button.',
        'View total fuel used, total cost, and cost per kilometer.'
      ]
    }
  },
  'calculators/housing-fund': {
    zh: {
      audience: '无论是准备申请公积金贷款的购房者、关注贷款额度的职工，还是研究还款方案的置业顾问，都能快速评估月供与利息。',
      steps: [
        '在"贷款金额"输入框中填写公积金贷款额度（万元）。',
        '填写公积金贷款年利率（%）与贷款年限。',
        '选择还款方式（等额本息/等额本金）。',
        '点击"开始计算"，查看月供、还款总额与利息总额。'
      ]
    },
    en: {
      audience: 'Whether you are applying for a housing fund loan, checking your loan limit, or comparing repayment plans, you can quickly estimate payments and interest.',
      steps: [
        'Enter the housing fund loan amount (in ten-thousands).',
        'Enter the annual interest rate (%) and loan term (years).',
        'Choose a repayment method (equal payment or equal principal).',
        'Click "Calculate" to see monthly payment, total payment, and total interest.'
      ]
    }
  },
  'calculators/ideal-weight': {
    zh: {
      audience: '无论是关注自身体重的健身人群、制定健康目标的白领，还是提供健康指导的从业者，都能基于国际通用公式获得体重参考范围。',
      steps: [
        '在"身高"输入框中填写身高（厘米）。',
        '在"年龄"输入框中填写年龄（如有）。',
        '点击"开始计算"按钮。',
        '查看 Broca、Devine 等多种公式给出的健康体重范围。'
      ]
    },
    en: {
      audience: 'Whether you are into fitness, setting health goals, or working in health guidance, you can get a healthy weight range based on internationally recognized formulas.',
      steps: [
        'Enter your height in centimeters.',
        'Enter your age if available.',
        'Click the "Calculate" button.',
        'Review healthy weight ranges from Broca, Devine, and other formulas.'
      ]
    }
  },
  'calculators/loan-compare': {
    zh: {
      audience: '无论是比较不同银行贷款方案的借款人、评估融资成本的经营者，还是提供贷款建议的顾问，都能直观对比两套方案的差异。',
      steps: [
        '在"贷款金额"输入框中填写贷款总额（万元）。',
        '填写两种方案的年利率与相同的贷款年限。',
        '点击"开始计算"按钮。',
        '对比两种方案的月供、总还款与总利息差异。'
      ]
    },
    en: {
      audience: 'Whether you are comparing bank loan offers, evaluating financing costs, or advising borrowers, you can compare two plans side by side.',
      steps: [
        'Enter the total loan amount in the first field.',
        'Enter the annual rates for both plans and the shared loan term.',
        'Click the "Calculate" button.',
        'Compare monthly payments, total payment, and total interest between plans.'
      ]
    }
  },
  'calculators/mortgage': {
    zh: {
      audience: '无论是准备购房的刚需人群、考虑换房的改善型用户，还是研究月供方案的置业者，都能快速计算月供与利息明细。',
      steps: [
        '在"贷款金额"输入框中填写贷款总额（万元）。',
        '填写年利率（%）与贷款年限。',
        '选择还款方式：等额本息或等额本金。',
        '点击"开始计算"，查看月供、总利息与本金利息对比图。'
      ]
    },
    en: {
      audience: 'Whether you are a first-time home buyer, upgrading your home, or comparing mortgage plans, you can quickly calculate monthly payments and interest details.',
      steps: [
        'Enter the total loan amount in the first field.',
        'Enter the annual interest rate (%) and the loan term (years).',
        'Choose a repayment method: equal payment or equal principal.',
        'Click "Calculate" to see monthly payment, total interest, and a principal-interest chart.'
      ]
    }
  },
  'calculators/overtime': {
    zh: {
      audience: '无论是核对加班费的职场员工、计算用工成本的 HR，还是需要依据劳动法核算报酬的财务人员，都能快速得到加班工资明细。',
      steps: [
        '在"月薪"输入框中填写税前月薪（元）。',
        '填写工作日、休息日与法定节假日的加班时长（小时）。',
        '点击"开始计算"按钮。',
        '查看按 1.5/2/3 倍标准计算的加班费明细与合计。'
      ]
    },
    en: {
      audience: 'Whether you are an employee checking overtime pay, an HR calculating labor costs, or a finance professional applying labor law rates, you can get an instant breakdown.',
      steps: [
        'Enter your monthly salary (before tax) in the first field.',
        'Enter overtime hours for weekdays, weekends, and public holidays.',
        'Click the "Calculate" button.',
        'View the 1.5x/2x/3x overtime pay breakdown and the total.'
      ]
    }
  },
  'calculators/ovulation': {
    zh: {
      audience: '无论是备孕中的女性、关注生理周期的用户，还是提供生育指导的从业者，都能推算排卵日与易孕期，辅助科学备孕。',
      steps: [
        '在"周期天数"输入框中填写月经周期长度（天）。',
        '填写经期天数与末次月经日期。',
        '点击"开始计算"按钮。',
        '查看排卵日、易孕期与下次月经的预计日期。'
      ]
    },
    en: {
      audience: 'Whether you are planning a pregnancy, tracking your cycle, or advising on fertility, you can estimate ovulation and the fertile window for better planning.',
      steps: [
        'Enter your cycle length (days) in the first field.',
        'Enter your period length and the first day of your last period.',
        'Click the "Calculate" button.',
        'View the estimated ovulation day, fertile window, and next period date.'
      ]
    }
  },
  'calculators/password-gen': {
    zh: {
      audience: '无论是需要强密码保护账户的普通用户、管理多个账号的职场人士，还是重视信息安全的开发者，都能一键生成高强度随机密码。',
      steps: [
        '设置密码长度与是否包含大写、小写、数字、符号。',
        '选择要生成的密码数量。',
        '点击"生成"按钮。',
        '查看生成的密码与强度评级，点击复制使用。'
      ]
    },
    en: {
      audience: 'Whether you need strong passwords for your accounts, manage multiple logins, or care about information security, you can generate high-strength random passwords in one click.',
      steps: [
        'Set the password length and choose whether to include uppercase, lowercase, digits, and symbols.',
        'Choose how many passwords to generate.',
        'Click the "Generate" button.',
        'Review the passwords and strength rating, then copy the one you need.'
      ]
    }
  },
  'calculators/percentage-calc': {
    zh: {
      audience: '无论是购物时计算折扣的消费者、核算利润率的小微商户，还是处理数据的学生，都能快速完成百分比相关计算。',
      steps: [
        '选择计算模式：百分比计算、增减、变化或折扣。',
        '在对应的输入框中填写数值。',
        '点击"计算"按钮。',
        '查看结果与简要说明。'
      ]
    },
    en: {
      audience: 'Whether you are calculating discounts while shopping, working out profit margins, or doing math homework, you can handle percentage calculations in seconds.',
      steps: [
        'Choose a mode: percentage, increase/decrease, change, or discount.',
        'Enter your values in the corresponding fields.',
        'Click the "Calculate" button.',
        'View the result with a brief explanation.'
      ]
    }
  },
  'calculators/qr-generator': {
    zh: {
      audience: '无论是分享链接的营销人员、制作物料的设计师，还是需要二维码的普通用户，都能快速生成并下载自定义二维码。',
      steps: [
        '在输入框中粘贴文字或链接。',
        '选择二维码尺寸与纠错级别。',
        '点击"生成"按钮。',
        '预览二维码，点击"下载"保存为 PNG 图片。'
      ]
    },
    en: {
      audience: 'Whether you are a marketer sharing links, a designer creating materials, or a regular user, you can generate and download custom QR codes in seconds.',
      steps: [
        'Paste your text or URL into the input field.',
        'Choose the QR code size and error correction level.',
        'Click the "Generate" button.',
        'Preview the QR code and click "Download" to save it as PNG.'
      ]
    }
  },
  'calculators/random-gen': {
    zh: {
      audience: '无论是做抽奖活动的主持人、需要随机数的开发测试人员，还是课堂互动的教师，都能快速批量生成随机整数。',
      steps: [
        '设置随机数的最小值与最大值。',
        '设置生成数量，可选不重复与排序。',
        '点击"生成"按钮。',
        '查看随机数列表，点击复制使用。'
      ]
    },
    en: {
      audience: 'Whether you are running a raffle, testing code with random values, or teaching in class, you can generate random integers in bulk instantly.',
      steps: [
        'Set the minimum and maximum values for the random numbers.',
        'Set how many numbers to generate; optionally unique and sorted.',
        'Click the "Generate" button.',
        'Review the random number list and copy as needed.'
      ]
    }
  },
  'calculators/tax2026': {
    zh: {
      audience: '无论是需要估算个税的上班族、核算工资成本的 HR，还是准备年度汇算的纳税人，都能按 2026 年最新税率快速计算应纳税额。',
      steps: [
        '在"税前月薪"输入框中填写月收入（元）。',
        '填写五险一金与专项附加扣除金额（如有）。',
        '点击"计算"按钮。',
        '查看应纳税所得额、应缴个税与税后收入。'
      ]
    },
    en: {
      audience: 'Whether you are an employee estimating your tax, an HR calculating payroll costs, or a taxpayer preparing for annual filing, you can compute tax due under the 2026 brackets.',
      steps: [
        'Enter your monthly pre-tax income in the first field.',
        'Enter social insurance and special deductions if applicable.',
        'Click the "Calculate" button.',
        'View taxable income, tax due, and after-tax income.'
      ]
    }
  },
  'calculators/unit-converter': {
    zh: {
      audience: '无论是学习中的学生、工作中的工程师，还是日常生活中需要换算的用户，都能快速完成长度、重量、温度等单位转换。',
      steps: [
        '选择换算类别（长度、重量、温度、面积等）。',
        '在"数值"输入框中填写要换算的数字。',
        '选择"从"和"到"单位。',
        '立即查看换算结果，支持反向换算。'
      ]
    },
    en: {
      audience: 'Whether you are a student, an engineer, or anyone who needs quick conversions in daily life, you can convert length, weight, temperature, area, and more.',
      steps: [
        'Choose a conversion category (length, weight, temperature, area, etc.).',
        'Enter the value you want to convert.',
        'Select the "From" and "To" units.',
        'See the result instantly; reverse conversion is supported.'
      ]
    }
  },
  'image/base64': {
    zh: {
      audience: '无论是需要嵌入图片的前端开发者、制作邮件签名的设计师，还是处理素材的运营人员，都能快速把图片转为 Base64 编码。',
      steps: [
        '选择或拖入一张图片文件。',
        '等待浏览器本地处理完成。',
        '查看生成的 Base64 字符串。',
        '点击"复制"将结果保存到剪贴板。'
      ]
    },
    en: {
      audience: 'Whether you are a front-end developer embedding images, a designer creating email signatures, or an operator preparing assets, you can convert images to Base64 instantly.',
      steps: [
        'Select or drag in an image file.',
        'Wait for the in-browser processing to finish.',
        'Review the generated Base64 string.',
        'Click "Copy" to save the result to your clipboard.'
      ]
    }
  },
  'image/color-picker': {
    zh: {
      audience: '无论是设计师、前端开发者，还是需要提取图片配色的运营人员，都能快速从图片中取色并获取色值代码。',
      steps: [
        '上传或拖入一张图片。',
        '在图片上点击要取色的位置。',
        '查看该点的 HEX/RGB/HSL 色值。',
        '点击色值即可复制，方便在设计中直接使用。'
      ]
    },
    en: {
      audience: 'Whether you are a designer, a front-end developer, or someone who needs to extract colors from images, you can pick colors and get their codes in seconds.',
      steps: [
        'Upload or drag in an image.',
        'Click on the image at the position you want to sample.',
        'View the HEX/RGB/HSL values for that point.',
        'Click a value to copy it for use in your design.'
      ]
    }
  },
  'image/compress': {
    zh: {
      audience: '无论是上传图片受限的运营人员、需要优化网站速度的站长，还是分享照片的普通用户，都能在浏览器本地压缩图片大小。',
      steps: [
        '选择或拖入一张或多张图片。',
        '选择压缩质量与输出格式。',
        '点击"压缩"按钮，等待本地处理完成。',
        '预览压缩前后大小对比，点击下载。'
      ]
    },
    en: {
      audience: 'Whether you are uploading to a platform with size limits, optimizing website speed, or sharing photos, you can compress images locally in your browser.',
      steps: [
        'Select or drag in one or more images.',
        'Choose the compression quality and output format.',
        'Click "Compress" and wait for the local processing.',
        'Compare sizes before/after and download the result.'
      ]
    }
  },
  'image/convert': {
    zh: {
      audience: '无论是需要不同格式素材的设计师、处理配图的编辑，还是转换图片格式的普通用户，都能快速完成 JPG/PNG/WebP 互转。',
      steps: [
        '选择或拖入要转换的图片。',
        '选择目标格式（JPG/PNG/WebP）。',
        '点击"转换"按钮。',
        '下载转换后的图片文件。'
      ]
    },
    en: {
      audience: 'Whether you are a designer needing different formats, an editor preparing images, or a regular user, you can convert between JPG, PNG, and WebP quickly.',
      steps: [
        'Select or drag in the image to convert.',
        'Choose the target format (JPG, PNG, or WebP).',
        'Click the "Convert" button.',
        'Download the converted image.'
      ]
    }
  },
  'image/resize': {
    zh: {
      audience: '无论是上传头像需要特定尺寸的用户、制作社媒素材的运营，还是调整配图的编辑，都能保持比例快速调整图片尺寸。',
      steps: [
        '选择或拖入一张图片。',
        '输入目标宽度或高度，保持宽高比。',
        '点击"调整"按钮。',
        '预览调整结果并下载。'
      ]
    },
    en: {
      audience: 'Whether you need a specific avatar size, social media assets, or resized images for articles, you can resize images while keeping the aspect ratio.',
      steps: [
        'Select or drag in an image.',
        'Enter the target width or height while keeping the aspect ratio.',
        'Click the "Resize" button.',
        'Preview and download the resized image.'
      ]
    }
  }
};

/* ============ 执行替换 ============ */
function fixFile(relPath, lang) {
  const abs = join(ROOT, lang, relPath + '.html');
  if (!existsSync(abs)) { console.log(`SKIP (missing): ${lang}/${relPath}`); return false; }
  let html = readFileSync(abs, 'utf8');
  const spec = CONTENT[relPath];
  if (!spec) { console.log(`SKIP (no spec): ${lang}/${relPath}`); return false; }
  const s = spec[lang];
  let changed = false;

  // 1) About 第二段（受众）
  const audiencePatterns = lang === 'zh'
    ? [/<p>无论是写作者[^<]*<\/p>/, /<p>无论是写作者、编辑、学生还是网站开发者[^<]*<\/p>/]
    : [/<p>It is especially useful[^<]*<\/p>/, /<p>It is especially useful for writers[^<]*<\/p>/];
  for (const p of audiencePatterns) {
    if (p.test(html)) {
      html = html.replace(p, `<p>${s.audience}</p>`);
      changed = true;
      break;
    }
  }

  // 2) How to Use 步骤（ol 替换）
  const zhOl = /<h2>如何使用[^<]*<\/h2>\s*<ol>[\s\S]*?<\/ol>/;
  const enOl = /<h2>How to Use[^<]*<\/h2>\s*<ol>[\s\S]*?<\/ol>/;
  const olPat = lang === 'zh' ? zhOl : enOl;
  if (olPat.test(html)) {
    const items = s.steps.map(st => `    <li>${st}</li>`).join('\n');
    const h2 = lang === 'zh' ? `<h2>如何使用</h2>` : `<h2>How to Use</h2>`;
    html = html.replace(olPat, `${h2}\n<ol>\n${items}\n</ol>`);
    changed = true;
  }

  if (changed) {
    if (DRY) { console.log(`[dry-run] would fix: ${lang}/${relPath}`); }
    else { writeFileSync(abs, html, 'utf8'); console.log(`fixed: ${lang}/${relPath}`); }
  } else {
    console.log(`NO-CHANGE: ${lang}/${relPath} (patterns not found)`);
  }
  return changed;
}

const targets = Object.keys(CONTENT);
let fixed = 0;
for (const t of targets) {
  fixFile(t, 'zh');
  fixFile(t, 'en');
  fixed += 2;
}
console.log(`\n${DRY ? '[dry-run] ' : ''}done, ${targets.length} tools x 2 languages = ${fixed} files processed`);
