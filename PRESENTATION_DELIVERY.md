# Presentation delivery

The generation response contains `data.result.preview.slides[].imageUrl` for
direct use as an image source and `preview.downloadUrls.pptx` / `.pdf` for
downloads. Existing `slides[].url` and `downloads` retain API-relative paths.
Use each slide image in an `img` element; PowerPoint downloads cannot be embedded
as browser previews. Missing PDF downloads remain null.

Set `PUBLIC_API_BASE_URL=https://pan2-backend-ivuf.onrender.com` in deployment.
On Render, `RENDER_EXTERNAL_URL` is also supported as a fallback.

Mount persistent storage and set `LEDIFY_PRESENTATION_ROOT` to its writable
directory (for example `/var/data/presentations`). Rendering and asset routes
both use this location. Setting the variable alone does not create a persistent
disk. Without persistent storage, a restart or deployment can remove generated
artifacts; existing links then return HTTP 404 with
`errorCode: PRESENTATION_ASSET_NOT_FOUND`. Lost files must be generated again.
Multiple backend instances require shared storage or an object-storage service.

Check a real URL with `GET /api/presentations/<uuid>/slides/1`. Success returns
HTTP 200, Content-Type image/png, and PNG bytes. Literal route placeholders
return HTTP 400. A missing slide returns HTTP 404. CORS is enabled in the app.
