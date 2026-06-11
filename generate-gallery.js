const fs = require('fs');
const path = require('path');

// Point this to your images directory
const imageDir = path.join(__dirname, 'images');

// Read the folder
const files = fs.readdirSync(imageDir);

const projects = files
  .filter(file => file.match(/\.(jpg|jpeg|png|webp|gif)$/i)) // Only keep images
  .map(file => {
    // Remove the file extension and replace dashes/underscores with spaces
    let title = file.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
    
    // Capitalize the first letter of each word
    title = title.replace(/\b\w/g, char => char.toUpperCase());

    return {
      title: title,
      image: `images/${file}` // The path your HTML needs to find the image
    };
  });

// Save it to a JSON file in your main folder
fs.writeFileSync('projects.json', JSON.stringify(projects, null, 2));
console.log(`Success! Created projects.json with ${projects.length} images.`);