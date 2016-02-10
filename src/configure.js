import warning from './utils/warning';
import DefaultTheme from './DefaultTheme';
import requireModuleDefault from './utils/requireModuleDefault';

// Removes potential multiple slashes from concatenating paths
const removeMultiSlashes = (path) => path.replace(/\/+/g, '/');
const stripTrailingSlashes = (path) => path.replace(/\/+$/, '');

const has = (key) => (o) => o.hasOwnProperty(key);
const hasName = has('name');
const hasTitle = has('title');
const hasSrc = has('src');
const hasPages = has('pages');
const hasComponent = has('component');

const flattenPageTree = (pageTree) => {
  return pageTree
    .reduce((pages, page) => pages.concat(page.pages ? [page, ...page.pages] : [page]), [])
    .filter((page) => page.src || page.component)
    .map((page, index) => ({...page, index}));
};

export default (config) => {
  let pageId = 0;

  const pageReducer = (pages, page) => {
    const configStyles = config.styles || [];
    const pageStyles = page.styles || [];
    const configScripts = config.scripts || [];
    const pageScripts = page.scripts || [];
    const basePath = config.basePath || '/';

    warning(
      !hasName(page),
      'The page configuration property `name` is deprecated; use `path` instead.',
      page
    );

    warning(
      hasTitle(page),
      'The page configuration property `title` is missing.',
      page
    );

    warning(
      !hasSrc(page) || typeof page.src === 'string',
      'The page configuration property `src` must be a string.',
      page
    );

    warning(
      !hasComponent(page) || typeof requireModuleDefault(page.component) === 'function',
      'The page configuration property `component` must be a React component.',
      page
    );

    warning(
      (hasSrc(page) && !hasComponent(page) && !hasPages(page)) || (!hasSrc(page) && hasComponent(page) && !hasPages(page)) || (!hasSrc(page) && !hasComponent(page) && hasPages(page)),
      'The page configuration should (only) have one of these properties: `src`, `component` or `pages`.',
      page
    );


    return [
      ...pages,
      {
        ...page,
        id: ++pageId,
        // Currently, catalog can't be nested inside other page routes, it messes up <Link> matching. Use `basePath`
        path: removeMultiSlashes('/' + stripTrailingSlashes([basePath, page.path || page.name].join('/'))),
        pages: page.pages ? page.pages.reduce(pageReducer, []).map((p) => ({...p, superTitle: page.title})) : null,
        styles: Array.from(new Set([...configStyles, ...pageStyles])),
        scripts: Array.from(new Set([...configScripts, ...pageScripts])),
        imports: {...config.imports, ...page.imports}
      }
    ];
  };

  const pageTree = config.pages.reduce(pageReducer, []).map((p) => ({...p, superTitle: config.title}));
  const pages = flattenPageTree(pageTree);

  return {
    ...config,
    // Used to check in configureRoutes() if input is already configured
    __catalogConfig: true,
    theme: {...DefaultTheme, ...config.theme},
    specimens: {...config.specimens},
    pages,
    pageTree
  };
};
