# aeaiou Frontend

A modern, user-friendly frontend for the aeaiou AI image generation service.

## Features

- Clean, minimalist design that highlights generated images
- Responsive layout that works on mobile and desktop
- Easy-to-use interface with style selection options
- Gallery section to showcase example generations
- Direct integration with the aeaiou API

## Deployment Instructions

### Local Testing

1. Simply open `index.html` in your browser to test locally
2. The frontend will connect to your deployed API at `https://aeaiou-api.onrender.com/api/v1`

### Deploying to Render.com

1. Push this frontend code to a GitHub repository
2. Log in to Render.com
3. Click "New +" and select "Static Site"
4. Connect to your GitHub repository
5. Configure the following settings:
   - **Name**: `aeaiou-frontend` (or your preferred name)
   - **Build Command**: Leave empty (or use `echo "Static site, no build needed"`)
   - **Publish Directory**: `.` (the root directory)
6. Click "Create Static Site"

### Setting Up a Custom Domain (Optional)

1. In your Render dashboard, select your frontend service
2. Go to the "Settings" tab
3. Scroll to "Custom Domain"
4. Click "Add Custom Domain"
5. Follow the instructions to configure your domain's DNS settings

## Connecting to Your API

The frontend is pre-configured to connect to `https://aeaiou-api.onrender.com/api/v1`. If you need to change this:

1. Open `app.js`
2. Modify the `API_BASE_URL` constant at the top of the file
3. If you've deployed to a custom domain, use that URL instead

## CORS Configuration

Make sure your API has the correct CORS configuration to allow requests from your frontend domain:

```python
CORS_ORIGINS = ["https://aeaiou.com", "https://www.aeaiou.com", "https://aeaiou-frontend.onrender.com"]
```

## Testing the Connection

After deployment:
1. Visit your frontend URL
2. Enter a prompt and click "Generate"
3. The frontend should connect to your API and display the generated image

## Customization

Feel free to customize the design by modifying:
- `styles.css` for visual changes
- `index.html` for layout changes
- `app.js` for functionality changes
