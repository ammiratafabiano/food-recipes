import { Component } from '@angular/core';
import type { OnInit } from '@angular/core';
import { Item } from 'src/app/models/item.model';
import { NavigationService } from 'src/app/services/navigation.service';

@Component({
  selector: 'app-item-selection',
  templateUrl: './item-selection.page.html',
  styleUrls: ['./item-selection.page.scss'],
})
export class ItemSelectionPage implements OnInit {

  items: Item[] = [];
  selectedItems: string[] = [];
  title = 'Select Items';
  
  filteredItems: Item[] = [];
  workingSelectedValues: string[] = [];

  constructor(private readonly navigationService: NavigationService) {
    
  }

  ngOnInit() {
    this.items = this.navigationService.getParams<{items: Item[], selectedItem: string[]}>()?.items || this.navigationService.pop();
    this.selectedItems = this.navigationService.getParams<{items: Item[], selectedItems: string[]}>()?.selectedItems || [];
    this.filteredItems = [...this.items];
    this.workingSelectedValues = [...this.selectedItems];
  }
  
  trackItems(index: number, item: Item) {
    return item.value;
  }
  
  onBackClicked() {
    return this.navigationService.pop();
  }
  
  onItemClicked(item: Item) {
    return this.navigationService.pop(item);
  }
  
  searchbarInput(ev: any) {
    this.filterList(ev.target.value);
  }
  
  /**
   * Update the rendered view with
   * the provided search query. If no
   * query is provided, all data
   * will be rendered.
   */
  filterList(searchQuery: string | undefined) {
    /**
     * If no search query is defined,
     * return all options.
     */
    if (searchQuery === undefined) {
      this.filteredItems = [...this.items];
    } else {
      /**
       * Otherwise, normalize the search
       * query and check to see which items
       * contain the search query as a substring.
       */
      const normalizedQuery = searchQuery.toLowerCase(); 
      this.filteredItems = this.items.filter(item => {
        return item.text.toLowerCase().includes(normalizedQuery);
      });
    }
  }
  /* TODO multiple selection
  isChecked(value: string) {
    return this.workingSelectedValues.find(item => item === value);
  }
  
  checkboxChange(ev: any) {
    const { checked, value } = ev.detail;
    
    if (checked) {
      this.workingSelectedValues = [
        ...this.workingSelectedValues,
        value
      ]
    } else {
      this.workingSelectedValues = this.workingSelectedValues.filter(item => item !== value);
    }
  }*/
}
