import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { By } from '@angular/platform-browser';
import { NgSelectModule } from '@ng-select/ng-select';
import { I18nTestingModule } from '@spartacus/core';
import { OrgUnitService } from '@spartacus/organization/administration/core';
import { FormErrorsComponent } from '@spartacus/storefront';
import { UrlTestingModule } from 'projects/core/src/routing/configurable-routes/url-translation/testing/url-testing.module';
import { of } from 'rxjs';
import { FormTestingModule } from '../../shared/form/form.testing.module';
import { UserGroupItemService } from '../services/user-group-item.service';
import { UserGroupFormComponent } from './user-group-form.component';

const mockForm = new FormGroup({
  uid: new FormControl(),
  name: new FormControl(),
  orgUnit: new FormGroup({
    uid: new FormControl(),
  }),
});

class MockOrgUnitService {
  getActiveUnitList() {
    return of([]);
  }
  loadList() {}
}

class MockItemService {
  getForm() {}
}

describe('UserGroupFormComponent', () => {
  let component: UserGroupFormComponent;
  let fixture: ComponentFixture<UserGroupFormComponent>;
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
      declarations: [UserGroupFormComponent, FormErrorsComponent],
      providers: [
        { provide: OrgUnitService, useClass: MockOrgUnitService },
        {
          provide: UserGroupItemService,
          useClass: MockItemService,
        },
      ],
    }).compileComponents();

    b2bUnitService = TestBed.inject(OrgUnitService);

    spyOn(b2bUnitService, 'getActiveUnitList').and.callThrough();
    spyOn(b2bUnitService, 'loadList').and.callThrough();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(UserGroupFormComponent);
    component = fixture.componentInstance;
    component.ngOnInit();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render form controls', () => {
    component.form = mockForm;
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

  it('should get active b2bUnits from service', () => {
    component.form = mockForm;
    expect(b2bUnitService.getActiveUnitList).toHaveBeenCalled();
  });

  it('should load list of b2bUnits on subscription', () => {
    component.form = mockForm;
    fixture.detectChanges();
    expect(b2bUnitService.loadList).toHaveBeenCalled();
  });

  describe('createUidWithName', () => {
    it('should set uid field value if empty based on provided name value', () => {
      mockForm.get('name').patchValue('Unit Test Value');
      mockForm.get('uid').patchValue(undefined);
      component.form = mockForm;
      component.createUidWithName(
        component.form.get('name'),
        component.form.get('uid')
      );

      expect(component.form.get('uid').value).toEqual('unit-test-value');
    });
    it('should prevent setting uid if value is provided for this field', () => {
      mockForm.get('name').patchValue('Unit Test Value');
      mockForm.get('uid').patchValue('test uid');
      component.form = mockForm;
      component.createUidWithName(
        component.form.get('name'),
        component.form.get('uid')
      );

      expect(component.form.get('uid').value).toEqual('test uid');
    });
  });
});
