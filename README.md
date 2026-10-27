This was part of an initiative to move the API from JavaScript -> TypeScript. Specifically this folder shows the core-server used by all of the API services. In addition to the conversion, this library attempted to:
- Manage Sessions/Connections - 
- Handled WebSockets
- Used a custom TCP protocol to communicate with services.
Originally it was a custom library that:
- light custom wrapper around Nodejs (HTTP/HTTPS) std library
- had middle ware
- forwarded requests to connected upstreams
- performed request schema validation
- 
