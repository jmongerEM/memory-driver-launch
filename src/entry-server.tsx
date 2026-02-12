import { createStartHandler, defaultRenderHandler } from '@tanstack/react-start/server'

// Router is provided via Register and Start's manifest; pass the render handler directly
export default createStartHandler(defaultRenderHandler)