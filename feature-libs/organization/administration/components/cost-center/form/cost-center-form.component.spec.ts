import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { By } from '@angular/platform-browser';
import { NgSelectModule } from '@ng-select/ng-select';
import { CurrencyService, I18nTestingModule } from '@spartacus/core';
import { OrgUnitService } from '@spartacus/organization/administration/core';
import { FormErrorsComponent } from '@spartacus/storefront';
import { UrlTestingModule } from 'projects/core/src/routing/configurable-routes/url-translation/testing/url-testing.module';
import { of } from 'rxjs';
import { FormTestingModule } from '../../shared/form/form.testing.module';
import { CostCenterItemService } from '../services/cost-center-item.service';
import { CostCenterFormComponent } from './cost-center-form.component';

const mockForm = new FormGroup({
  name: new FormControl(),
  code: new FormControl(),
  currency: new FormGroup({
    isocode: new FormControl(),
  }),
  unit: new FormGroup({
    uid: new FormControl(),
  }),
});

class MockOrgUnitService {
  getActiveUnitList() {
    return of([]);
  }
  loadList() {}
}

class MockCurrencyService {
  getAll() {
    return of();
  }
}

class MockItemService {
  getForm() {
    return mockForm;
  }
}

describe('CostCenterFormComponent', () => {
  let component: CostCenterFormComponent;
  let fixture: ComponentFixture<CostCenterFormComponent>;
  let currencyService: CurrencyService;
  let b2bUnitService: OrgUnitService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        I18nTestingModule,
        UrlTestingModule,
        ReactiveFormsModule,
        NgSelectModule,
        FormTestingModule,
      ],
      declarations: [CostCenterFormComponent, FormErrorsComponent],
      providers: [
        { provide: CurrencyService, useClass: MockCurrencyService },
        { provide: OrgUnitService, useClass: MockOrgUnitService },
        {
          provide: CostCenterItemService,
          useClass: MockItemService,
        },
      ],
    }).compileComponents();

    currencyService = TestBed.inject(CurrencyService);
    b2bUnitService = TestBed.inject(OrgUnitService);

    spyOn(currencyService, 'getAll').and.callThrough();
    spyOn(b2bUnitService, 'getActiveUnitList').and.callThrough();
    spyOn(b2bUnitService, 'loadList').and.callThrough();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CostCenterFormComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render form controls', () => {
    fixture.detectChanges();
    const formControls = fixture.debugElement.queryAll(By.css('input'));
    expect(formControls.length).toBeGreaterThan(0);
  });

  it('should not render any form controls if the form is falsy', () => {
    component.form = undefined;
    fixture.detectChanges();
    const formControls = fixture.debugElement.queryAll(By.css('input'));
    expect(formControls.length).toBe(0);
  });

  it('should get currencies from service', () => {
    expect(currencyService.getAll).toHaveBeenCalled();
  });

  it('should get active units from service', () => {
    expect(b2bUnitService.getActiveUnitList).toHaveBeenCalled();
  });

  describe('createCodeWithName', () => {
    it('should set code field value if empty based on provided name value', () => {
      mockForm.get('name').patchValue('Unit Test Value');
      mockForm.get('code').patchValue(undefined);
      component.form = mockForm;
      component.createCodeWithName(
        component.form.get('name'),
        component.form.get('code')
      );

      expect(component.form.get('code').value).toEqual('unit-test-value');
    });
    it('should prevent setting code if value is provided for this field', () => {
      mockForm.get('name').patchValue('Unit Test Value');
      mockForm.get('code').patchValue('test code');
      component.form = mockForm;
      component.createCodeWithName(
        component.form.get('name'),
        component.form.get('code')
      );

      expect(component.form.get('code').value).toEqual('test code');
    });
  });
});
