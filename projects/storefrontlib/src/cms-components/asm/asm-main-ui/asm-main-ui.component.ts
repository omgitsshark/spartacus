import {
  Component,
  HostBinding,
  OnInit,
  ViewEncapsulation,
} from '@angular/core';
import {
  AsmService,
  AuthService,
  CsAgentAuthService,
  GlobalMessageService,
  GlobalMessageType,
  RoutingService,
  User,
  UserService,
} from '@spartacus/core';
import { Observable, of } from 'rxjs';
import { map, switchMap, take } from 'rxjs/operators';
import { AsmComponentService } from '../services/asm-component.service';

@Component({
  selector: 'cx-asm-main-ui',
  templateUrl: './asm-main-ui.component.html',
  styleUrls: ['./asm-main-ui.component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class AsmMainUiComponent implements OnInit {
  customerSupportAgentLoggedIn$: Observable<boolean>;
  csAgentTokenLoading$: Observable<boolean>;
  customer$: Observable<User>;
  isCollapsed$: Observable<boolean>;

  @HostBinding('class.hidden') disabled = false;

  private startingCustomerSession = false;

  constructor(
    protected authService: AuthService,
    protected csAgentAuthService: CsAgentAuthService,
    protected userService: UserService,
    protected asmComponentService: AsmComponentService,
    protected globalMessageService: GlobalMessageService,
    protected routingService: RoutingService,
    protected asmService: AsmService
  ) {}

  ngOnInit(): void {
    this.customerSupportAgentLoggedIn$ = this.csAgentAuthService.isCustomerSupportAgentLoggedIn();
    this.csAgentTokenLoading$ = this.csAgentAuthService.getCustomerSupportAgentTokenLoading();
    this.customer$ = this.authService.isUserLoggedIn().pipe(
      switchMap((isLoggedIn) => {
        if (isLoggedIn) {
          this.handleCustomerSessionStartRedirection();
          return this.userService.get();
        } else {
          return of(undefined);
        }
      })
    );
    this.isCollapsed$ = this.asmService
      .getAsmUiState()
      .pipe(map((uiState) => uiState.collapsed));
  }

  private handleCustomerSessionStartRedirection(): void {
    this.asmComponentService
      .isCustomerEmulationSessionInProgress()
      .pipe(take(1))
      .subscribe((isCustomerEmulated) => {
        if (this.startingCustomerSession && isCustomerEmulated) {
          this.startingCustomerSession = false;
          this.globalMessageService.remove(GlobalMessageType.MSG_TYPE_ERROR);
          this.routingService.go('/');
        }
      });
  }

  /** Tested */
  loginCustomerSupportAgent({
    userId,
    password,
  }: {
    userId: string;
    password: string;
  }): void {
    this.csAgentAuthService.authorizeCustomerSupportAgent(userId, password);
  }

  /** Tested */
  logout(): void {
    this.asmComponentService.logoutCustomerSupportAgentAndCustomer();
  }

  /** Tested */
  startCustomerEmulationSession({ customerId }: { customerId: string }): void {
    this.csAgentAuthService.startCustomerEmulationSession(customerId);
    this.startingCustomerSession = true;
  }

  hideUi(): void {
    this.disabled = true;
    this.asmComponentService.unload();
  }
}
