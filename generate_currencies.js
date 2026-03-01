const codes = [ "AED","AFN","ALL","AMD","ANG","AOA","ARS","AUD","AWG","AZN","BAM","BBD","BDT","BGN","BHD","BIF","BMD","BND","BOB","BRL","BSD","BTN","BWP","BYN","BZD","CAD","CDF","CHF","CLF","CLP","CNH","CNY","COP","CRC","CUP","CVE","CZK","DJF","DKK","DOP","DZD","EGP","ERN","ETB","FJD","FKP","FOK","GBP","GEL","GGP","GHS","GIP","GMD","GNF","GTQ","GYD","HKD","HNL","HRK","HTG","HUF","IDR","ILS","IMP","INR","IQD","IRR","ISK","JEP","JMD","JOD","JPY","KES","KGS","KHR","KID","KMF","KRW","KWD","KYD","KZT","LAK","LBP","LKR","LRD","LSL","LYD","MAD","MDL","MGA","MKD","MMK","MNT","MOP","MRU","MUR","MVR","MWK","MXN","MYR","MZN","NAD","NGN","NIO","NOK","NPR","NZD","OMR","PAB","PEN","PGK","PHP","PKR","PLN","PYG","QAR","RON","RSD","RUB","RWF","SAR","SBD","SCR","SDG","SEK","SGD","SHP","SLE","SLL","SOS","SRD","SSP","STN","SYP","SZL","THB","TJS","TMT","TND","TOP","TRY","TTD","TVD","TWD","TZS","UAH","UGX","USD","UYU","UZS","VES","VND","VUV","WST","XAF","XCD","XCG","XDR","XOF","XPF","YER","ZAR","ZMW","ZWG","ZWL" ];
const currencyNames = new Intl.DisplayNames(['fr'], { type: 'currency' });
const regionNames = new Intl.DisplayNames(['fr'], { type: 'region' });

const specialMappings = {
  'EUR': 'Zone Euro',
  'XOF': 'UEMOA (Afrique de l\'Ouest)',
  'XAF': 'CEMAC (Afrique Centrale)',
  'XCD': 'OECS (Caraïbes orientales)',
  'XPF': 'Pacifique français'
};

const result = codes.map(code => {
  let currencyLabel = code;
  try { 
    currencyLabel = currencyNames.of(code) || code; 
    currencyLabel = currencyLabel.charAt(0).toUpperCase() + currencyLabel.slice(1);
  } catch(e) {}
  
  let countryLabel = code;
  if (specialMappings[code]) {
    countryLabel = specialMappings[code];
  } else {
    try {
      const regionCode = code.slice(0, 2);
      const possibleRegion = regionNames.of(regionCode);
      if (possibleRegion && possibleRegion !== regionCode) {
        countryLabel = possibleRegion;
      }
    } catch(e) {}
  }

  const label = `${countryLabel} (${currencyLabel}, ${code})`.replace(/'/g, "\\'");
  const safeCountry = countryLabel.replace(/'/g, "\\'");
  return `  { code: '${code}', country: '${safeCountry}', label: '${label}' },`;
});
const output = `// Auto-generated list of supported currencies and their associated countries\nexport const CURRENCIES = [\n${result.join('\n')}\n];\n`;
require('fs').writeFileSync('./frontend/src/constants/currencies.ts', output);
