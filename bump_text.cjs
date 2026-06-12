const fs = require('fs');

const files = [
  'src/App.tsx',
  'src/components/OccupantMobile.tsx',
  'src/components/WardenTablet.tsx',
  'src/components/FSDCommandCenter.tsx'
];

const typographyMap = {
  'text-xs': 'text-sm',
  'text-sm': 'text-base',
  'text-base': 'text-lg',
  'text-lg': 'text-xl',
  'text-xl': 'text-2xl',
  'text-2xl': 'text-3xl',
  'text-3xl': 'text-4xl',
  'text-4xl': 'text-5xl'
};

files.forEach(file => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    
    // Replace text sizes based on the map above simultaneously to avoid double-bumping
    content = content.replace(/\btext-(xs|sm|base|lg|xl|2xl|3xl|4xl)\b/g, match => {
      return typographyMap[match] || match;
    });

    fs.writeFileSync(file, content, 'utf8');
    console.log(`Updated typography in ${file}`);
  } else {
    console.warn(`File not found: ${file}`);
  }
});

console.log('Typography upgrade complete.');
