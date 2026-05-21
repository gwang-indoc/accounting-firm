import { Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-services-page',
  standalone: true,
  imports: [MatIconModule, RouterLink],
  templateUrl: './services-page.component.html',
  styleUrl: './services-page.component.css',
})
export class ServicesPageComponent {
  readonly services = [
    {
      icon: 'receipt_long',
      title: 'Tax Preparation',
      description: 'Comprehensive individual and business tax filing. We navigate complex tax codes so you pay only what you owe — nothing more.',
      tag: 'Year-round support',
    },
    {
      icon: 'menu_book',
      title: 'Bookkeeping',
      description: 'Accurate monthly records, bank reconciliations, and financial statements that give you a clear picture of your business health.',
      tag: 'Monthly & quarterly',
    },
    {
      icon: 'trending_up',
      title: 'Financial Consulting',
      description: 'Strategic guidance on cash flow, growth planning, and investment decisions tailored to your goals and risk profile.',
      tag: 'Strategy sessions',
    },
    {
      icon: 'corporate_fare',
      title: 'Business Advisory',
      description: 'Entity structuring, acquisition due diligence, and exit planning for founders who want a trusted financial partner.',
      tag: 'For founders',
    },
    {
      icon: 'people',
      title: 'Payroll Services',
      description: 'Full-service payroll processing, compliance filings, and employee tax management for teams of any size.',
      tag: 'Automated & accurate',
    },
    {
      icon: 'account_balance',
      title: 'Estate Planning',
      description: "Trust structuring, wealth transfer strategies, and tax-efficient succession planning for your family's future.",
      tag: 'Generational wealth',
    },
  ];
}
