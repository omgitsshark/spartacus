import { Injectable } from '@angular/core';
import { defer, Observable, of } from 'rxjs';
import { filter, map, shareReplay, switchMap } from 'rxjs/operators';
import { UnifiedInjector } from '../../lazy-loading/unified-injector';
import { resolveApplicable } from '../../util/applicable';
import { uniteLatest } from '../../util/rxjs/unite-latest';
import { Page, PageMeta } from '../model/page.model';
import { PageMetaResolver } from '../page/page-meta.resolver';
import { CmsService } from './cms.service';

@Injectable({
  providedIn: 'root',
})
export class PageMetaService {
  private resolvers$: Observable<
    PageMetaResolver[]
  > = this.unifiedInjector
    .getMulti(PageMetaResolver)
    .pipe(shareReplay({ bufferSize: 1, refCount: true })) as Observable<
    PageMetaResolver[]
  >;

  constructor(
    protected cms: CmsService,
    protected unifiedInjector?: UnifiedInjector
  ) {}
  /**
   * The list of resolver interfaces will be evaluated for the pageResolvers.
   *
   * TODO: optimize browser vs SSR resolvers; image, robots and description
   *       aren't needed during browsing.
   */
  protected resolverMethods: { [key: string]: string } = {
    title: 'resolveTitle',
    heading: 'resolveHeading',
    description: 'resolveDescription',
    breadcrumbs: 'resolveBreadcrumbs',
    image: 'resolveImage',
    robots: 'resolveRobots',
  };

  protected meta$: Observable<PageMeta | null> = defer(() =>
    this.cms.getCurrentPage()
  ).pipe(
    filter(Boolean),
    switchMap((page: Page) => this.getMetaResolver(page)),
    switchMap((metaResolver: PageMetaResolver) =>
      metaResolver ? this.resolve(metaResolver) : of(null)
    ),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  getMeta(): Observable<PageMeta | null> {
    return this.meta$;
  }

  /**
   * If a `PageResolver` has implemented a resolver interface, the resolved data
   * is merged into the `PageMeta` object.
   * @param metaResolver
   */
  protected resolve(metaResolver: PageMetaResolver): Observable<PageMeta> {
    const resolveMethods: Observable<PageMeta>[] = Object.keys(
      this.resolverMethods
    )
      .filter((key) => metaResolver[this.resolverMethods[key]])
      .map((key) =>
        metaResolver[this.resolverMethods[key]]().pipe(
          map((data) => ({
            [key]: data,
          }))
        )
      );

    return uniteLatest(resolveMethods).pipe(
      map((data) => Object.assign({}, ...data))
    );
  }

  /**
   * Return the resolver with the best match, based on a score
   * generated by the resolver.
   *
   * Resolvers match by default on `PageType` and `page.template`.
   */
  protected getMetaResolver(page: Page): Observable<PageMetaResolver> {
    return this.resolvers$.pipe(
      map((resolvers) => resolveApplicable(resolvers, [page], [page]))
    );
  }
}
