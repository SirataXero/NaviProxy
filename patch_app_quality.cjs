const fs = require('fs');

const code = fs.readFileSync('src/App.tsx', 'utf8');

const mapQualityTierFromGo = `
  const mapQualityTierFromGo = (val: any): QualityTier => {
    if (typeof val === 'string') return val as QualityTier;
    switch (val) {
      case 1: return 'LOW_MP3_128';
      case 2: return 'MID_MP3_256';
      case 3: return 'HIGH_MP3_320';
      case 4: return 'CD_FLAC_16_44';
      case 5: return 'HIRES_FLAC_24_96';
      case 6: return 'HIRES_FLAC_24_192';
      default: return 'HIGH_MP3_320';
    }
  };

  const mapQualityTierToGo = (val: QualityTier): number => {
    switch (val) {
      case 'LOW_MP3_128': return 1;
      case 'MID_MP3_256': return 2;
      case 'HIGH_MP3_320': return 3;
      case 'CD_FLAC_16_44': return 4;
      case 'HIRES_FLAC_24_96': return 5;
      case 'HIRES_FLAC_24_192': return 6;
      default: return 3;
    }
  };
`;

let newCode = code.replace(
  /const mapConfig = \(data: any\): AppConfig => \{/,
  mapQualityTierFromGo + '\n  const mapConfig = (data: any): AppConfig => {'
);

newCode = newCode.replace(
  /minQuality: data.min_quality \|\| 'HIGH_MP3_320',/,
  `minQuality: mapQualityTierFromGo(data.min_quality),`
);

newCode = newCode.replace(
  /min_quality: newConfig.quality.minQuality,/,
  `min_quality: mapQualityTierToGo(newConfig.quality.minQuality),`
);

fs.writeFileSync('src/App.tsx', newCode);
console.log('Patched quality mapping');
