---
title: "AppArmor, una poderosa herramienta de seguridad"
description: "Aprende a como activar y configurar AppArmor en GNU/Linux"
pubDate: 2026-09-08T20:59:15.901Z
lang: es
categories: ["seguridad"]
tags: ["apparmor", "seguridad", "linux"]
cover: "./cover.webp"
coverAlt: ""
translationKey: "apparmor-introduction"
draft: false
math: false
author: "Jose Maldonado \"Yukiteru Amano\""
---

En el mundo de la seguridad informática, la protección de nuestros sistemas operativos es una prioridad constante. GNU/Linux, conocido por su robustez, no está exento de amenazas. Afortunadamente, contamos con herramientas poderosas que nos ayudan a fortificar nuestras distribuciones. Una de ellas, a menudo subestimada pero increíblemente efectiva, es **AppArmor**.

## ¿Qué es AppArmor y por qué debería importarte?

AppArmor (Application Armor) es un módulo de seguridad del kernel de Linux que se centra en el control de acceso obligatorio (MAC). A diferencia de los sistemas de control de acceso discrecional (DAC) tradicionales (como los permisos de usuario y grupo), AppArmor permite definir políticas de seguridad a nivel de aplicación.

![AppArmor, uno de los MAC más desarrollados dentro del kernel Linux](./apparmor-logo.jpg) 

En términos más sencillos, AppArmor te permite decirle a cada programa específico qué puede y qué no puede hacer en tu sistema. Esto incluye:

- **A qué archivos puede acceder:** Si un navegador web solo necesita leer y escribir archivos en tu directorio de usuario, AppArmor puede asegurarse de que no pueda acceder a archivos del sistema importantes o del directorio de otro usuario.
- **A qué capacidades de red puede acceder:** Puede restringir el acceso a bases de datos o servicios de red no autorizados.
- **A qué llamadas del sistema puede realizar:** Controla cómo un programa interactúa con el kernel.

### ¿Por qué ofrece mejor seguridad?

El principal beneficio de AppArmor es su capacidad para limitar el daño potencial de una aplicación comprometida. Por ejemplo, si un atacante logra explotar una vulnerabilidad en un programa (como un servidor web o un cliente de correo electrónico), AppArmor puede impedir que el programa malicioso se propague, acceda a datos sensibles o cause daños mayores al sistema. Es una segunda línea de defensa esencial.

La ventaja de AppArmor sobre otros sistemas de control a nivel de aplicación como SELinux (que también es muy potente, pero mucho más complejo de administrar) es que AppArmor se basa en parámetros de **pathname (dirección dentro de sistema de archivo)** estricto o patrones de pathname, lo que generalmente lo hace más fácil de entender y configurar para la mayoría de los administradores y usuarios.

## Instalación de AppArmor en Debian y Ubuntu

En la mayoría de las distribuciones modernas de Debian y Ubuntu, AppArmor ya viene instalado y habilitado por defecto. Sin embargo, es una buena práctica verificar su estado y asegurarse de que todos los componentes estén presentes, sobre todo porque la configuración por defecto en estos sistemas es permisiva (modo complain o no confinado).

Para confirmar si AppArmor está instalado y activo, puedes ejecutar:

```bash
sudo aa-status
```

Si AppArmor está operativo, verás una salida similar a esta, indicando los perfiles de aplicaciones que están actualmente en modo **Enforcing** o **Complain**:

``` bash
apparmor module is loaded.
1 profiles are loaded.
3 processes are unconfined.
/usr/sbin/cups-browsed (1234)
  /usr/sbin/cups-browsed (1235)
  /usr/sbin/cups-browsed (1236)
```

Si aa-status te indica que el módulo no está cargado, o deseas instalarlo manualmente, puedes hacerlo con:

```bash
# Actualizar la lista de paquetes
sudo apt update

# Instalar el paquete principal y administrativos de AppArmor
sudo apt install apparmor apparmor-utils

# Instalando perfiles
sudo apt install apparmor-profiles apparmor-profiles-extra
```

Una vez instalado, deberías reiniciar tu sistema para asegurarte de que el módulo del kernel se carga correctamente.

## ¿Cómo funciona AppArmor? Perfiles de seguridad

AppArmor opera a través de la creación y aplicación de perfiles de seguridad. Un perfil es un archivo de texto que define precisamente las reglas de acceso para una aplicación específica. Estos perfiles se ubican típicamente en el directorio `/etc/apparmor.d/`.

Cada perfil contiene directivas que especifican:

- `owner`: El usuario que posee el perfil.
- `deny`: Acciones que están explícitamente prohibidas.
- `allow`: Acciones permitidas.
- `read, write, execute, link, mmap`: Permisos específicos sobre archivos o directorios.
- `glob`: Patrones de nombres de archivos o directorios.

Modos:

- **Enforcing*: Las reglas del perfil se aplican estrictamente. Cualquier intento de violar una regla será bloqueado y registrado.
- **Complain**: Las reglas del perfil se validan, pero las violaciones no se bloquean. Solo se registran las violaciones. Esto es útil para depurar perfiles.
- **Disabled**: El perfil está completamente inactivo para la aplicación.

Cuando una aplicación configurada con AppArmor se inicia, el kernel verifica si existe un perfil asociado a ese ejecutable específico. Si lo hay, AppArmor comienza a monitorear las acciones de la aplicación y a aplicar las reglas definidas en el perfil.

## Configurando y mejorando la seguridad con perfiles

Si bien, AppArmor es mucho más sencillo de administrar que SELinux, la realidad es que para cualquier persona con poco conocimientos, generar y configurar perfiles es una tarea ardua, una que iría más allá de este simple artículo.

Pero no todo está perdido, ya que la comunidad siempre responde. Hace años, un proyecto llamado apparmor.d, existe siendo creado por [**Alexandre Pujol**](https://pujol.io/), en el que hay más de 1500 perfiles AppArmor listos para usar. De hecho, yo personalmente colaboro con dicho proyecto generando perfiles y haciendo fine-tuning de los mismos para poder usarlos en modo **Enforcing** sin que ello interfiera con el funcionamiento normal de tu equipo.

El resultado es sorprendente. La mayoría de daemons (ej: rpcbind, Docker y libvirtd) en mi caso están protegidos por AppArmor. Y lo mejor de todo es que instalar todo esto en Debian o Ubuntu, no es complejo, basta con hacer esto:

```bash
# Instalando las dependencias
sudo apt install apparmor-profiles build-essential \ 
     config-package-dev debhelper golang-go rsync git

# Clonando el repositorio
git clone https://github.com/roddhjav/apparmor.d.git

# Construyendo el paquete .deb para instalar
cd apparmor.d
dpkg-buildpackage -b -d --no-sign

# Instalando el paquete
sudo dpkg -i ../apparmor.d_*.deb
```

Ya con estos pasos tienes +1500 perfiles de AppArmor listos para usar, en lo que en caso de ser necesarios, solo deberás hacer un pequeño fine-tuning para no tener problemas. Y en este ultimo caso, Pujol cuenta con una [web](https://apparmor.pujol.io/) donde está todo muy bien explicado.

**¿Sirve esto para otros sistemas?** Claro, siempre y cuando tu distro genere un kernel con AppArmor, no tendrás problemas, así que podrás usarlo en Fedora/Red Hat compatibles (si no te gusta SELinux), SUSE (donde ya viene activo por defecto), ArchLinux y derivadas, entre otras.

Lo mejor en todo caso, es que no tendrás que configurar todo a mano con estos perfiles y perfiles de seguridad como Firefox o Chromium (y todos sus derivados), funcionan muy bien tal como están. Esto te da la seguridad, de que incluso siendo atacado, tienes una protección extra para evitar daños al sistema, algo muy útil en servidores o si eres un cuasi-paranoico de la seguridad. La paz mental, que ofrece es única y aprendes mucho sobre la seguridad en Linux. 
